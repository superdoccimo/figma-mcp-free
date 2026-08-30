figma.showUI(__html__, { width: 440, height: 590, themeColors: true });

const MAX_SELECTIONS = 50;

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

async function exportSelectionNode(node) {
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
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    document
  };
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
  if (selection.length > MAX_SELECTIONS) {
    figma.ui.postMessage({ type: "capture-error", message: `Select at most ${MAX_SELECTIONS} nodes per snapshot.` });
    return;
  }

  try {
    const selections = [];
    for (const node of selection) selections.push(await exportSelectionNode(node));

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
