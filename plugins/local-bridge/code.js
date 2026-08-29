figma.showUI(__html__, { width: 440, height: 570, themeColors: true });

function selectionSummary() {
  return figma.currentPage.selection.map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type
  }));
}

function postSelectionSummary() {
  figma.ui.postMessage({
    type: "selection-summary",
    pageName: figma.currentPage.name,
    selections: selectionSummary()
  });
}

figma.on("selectionchange", postSelectionSummary);
postSelectionSummary();

figma.ui.onmessage = async (message) => {
  if (!message || message.type !== "capture-selection") return;

  const selection = Array.from(figma.currentPage.selection);
  if (selection.length === 0) {
    figma.ui.postMessage({ type: "capture-error", message: "Select at least one Figma node." });
    return;
  }
  if (selection.length > 50) {
    figma.ui.postMessage({ type: "capture-error", message: "Select at most 50 nodes per snapshot." });
    return;
  }

  try {
    const selections = [];
    for (const node of selection) {
      if (typeof node.exportAsync !== "function") {
        throw new Error(`The selected ${node.type} node cannot be exported as REST JSON.`);
      }
      const exported = await node.exportAsync({ format: "JSON_REST_V1" });
      const document = exported && typeof exported === "object" && exported.document
        ? exported.document
        : exported;
      if (!document || typeof document !== "object") {
        throw new Error(`Figma returned no REST document for ${node.name}.`);
      }
      selections.push({
        id: node.id,
        name: node.name,
        type: node.type,
        document
      });
    }

    figma.ui.postMessage({
      type: "capture-result",
      payload: {
        fileName: figma.root.name,
        pageName: figma.currentPage.name,
        selections
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export the selected Figma nodes.";
    figma.ui.postMessage({ type: "capture-error", message });
  }
};
