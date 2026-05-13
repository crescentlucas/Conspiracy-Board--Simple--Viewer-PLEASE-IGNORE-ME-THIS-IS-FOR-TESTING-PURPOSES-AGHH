const storageKey = "corkboard-app-simple-data";
const publishedDataPath = "data/boards.json";
const modeStorageKey = "corkboard-app-simple-mode";
const lineStyleStorageKey = "corkboard-app-simple-line-style";
const routeAroundBlocksStorageKey = "corkboard-app-simple-route-around-blocks";
const hideConnectionsStorageKey = "corkboard-app-simple-hide-connections";
const hideConnectionColorsStorageKey = "corkboard-app-simple-hide-connection-colors";
const hideTextColorsStorageKey = "corkboard-app-simple-hide-text-colors";
const justificationAnimationStorageKey = "corkboard-app-simple-justification-animation";

const viewport = document.querySelector("#boardViewport");
const board = document.querySelector("#board");
const zoomReadout = document.querySelector(".zoom-readout");
const boardMenu = document.querySelector("#boardMenu");
const toggleMode = document.querySelector("#toggleMode");
const newBoardForm = document.querySelector("#newBoardForm");
const newBoardName = document.querySelector("#newBoardName");
const newBoardThumbnail = document.querySelector("#newBoardThumbnail");
const currentBoardName = document.querySelector("#currentBoardName");
const renameBoardButton = document.querySelector("#renameBoardButton");
const changeBoardThumbnailButton = document.querySelector("#changeBoardThumbnailButton");
const boardThumbnailInput = document.querySelector("#boardThumbnailInput");
const deleteBoardButton = document.querySelector("#deleteBoardButton");
const toggleBlockForm = document.querySelector("#toggleBlockForm");
const toggleConnectMode = document.querySelector("#toggleConnectMode");
const toggleUnconnectMode = document.querySelector("#toggleUnconnectMode");
const connectionColor = document.querySelector("#connectionColor");
const toggleSettings = document.querySelector("#toggleSettings");
const settingsPanel = document.querySelector("#settingsPanel");
const closeSettings = document.querySelector("#closeSettings");
const duplicateLineStyle = document.querySelector("#duplicateLineStyle");
const routeAroundBlocks = document.querySelector("#routeAroundBlocks");
const hideConnections = document.querySelector("#hideConnections");
const hideConnectionColors = document.querySelector("#hideConnectionColors");
const hideTextColors = document.querySelector("#hideTextColors");
const animateJustificationReveal = document.querySelector("#animateJustificationReveal");
const blockPanel = document.querySelector("#blockPanel");
const blockForm = document.querySelector("#blockForm");
const blockTitle = document.querySelector("#blockTitle");
const blockText = document.querySelector("#blockText");
const blockImage = document.querySelector("#blockImage");
const blockPanelTitle = document.querySelector("#blockPanelTitle");
const blockSubmitButton = document.querySelector("#blockSubmitButton");
const deleteBlockButton = document.querySelector("#deleteBlockButton");
const cancelBlockEdit = document.querySelector("#cancelBlockEdit");
const currentImageNote = document.querySelector("#currentImageNote");
const linkBoardSelect = document.querySelector("#linkBoardSelect");
const linkBlockSelect = document.querySelector("#linkBlockSelect");
const formatTextInput = document.querySelector("#formatTextInput");
const formatColorSelect = document.querySelector("#formatColorSelect");
const formatSizeSelect = document.querySelector("#formatSizeSelect");
const insertColorButton = document.querySelector("#insertColorButton");
const insertSizeButton = document.querySelector("#insertSizeButton");
const insertJustifyButton = document.querySelector("#insertJustifyButton");
const insertLinkButton = document.querySelector("#insertLinkButton");
const viewerFocusCounter = document.querySelector("#viewerFocusCounter");
let viewerPreviousFocus = document.querySelector("#viewerPreviousFocus");
let viewerNextFocus = document.querySelector("#viewerNextFocus");
let zoomOutButton = document.querySelector("#zoomOutButton");
let zoomInButton = document.querySelector("#zoomInButton");

const minZoom = 0.3;
const maxZoom = 3;
const wheelZoomStep = 0.1;
const buttonZoomStep = 0.2;
const cardDragStartThreshold = 6;

ensureMobileViewerControls();

const colorValues = {
  red: "#ff0000",
  orange: "#ffa040",
  yellow: "#ffff00",
  blue: "#0000ff",
  green: "#00ff00",
  purple: "#ff00ff",
  cyan: "#14a9ff",
};

const state = {
  activeJustificationSourceBlockId: "",
  activeJustificationTargetBlockId: "",
  animateJustificationReveal: loadJustificationAnimation(),
  connectionMode: false,
  currentBoardId: "",
  data: createFallbackData(),
  draggedBlock: null,
  editingBlockId: "",
  editPreview: null,
  hideConnectionColors: loadHideConnectionColors(),
  hideConnections: loadHideConnections(),
  hideTextColors: loadHideTextColors(),
  isDraggingBoard: false,
  boardPointers: new Map(),
  pendingJustificationBlocks: [],
  pinchZoom: null,
  revealedJustificationBlockIds: [],
  resizedBlock: null,
  selectedConnectionBlockIds: [],
  suppressNextBoardClick: false,
  suppressNextBoardClickTimer: 0,
  unconnectMode: false,
  viewerFocusBaseBlockId: "",
  viewerFocusIndex: 0,
  viewerFocusTargets: [],
  viewerMode: true,
  duplicateLineStyle: loadDuplicateLineStyle(),
  routeAroundBlocks: loadRouteAroundBlocks(),
  lastX: 0,
  lastY: 0,
  scale: 1,
  x: 0,
  y: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createMobileControlButton(id, label, ariaLabel) {
  const button = document.createElement("button");
  button.className = "mobile-control-button";
  button.id = id;
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.title = ariaLabel;
  return button;
}

function ensureMobileViewerControls() {
  if (viewerPreviousFocus && viewerNextFocus && zoomOutButton && zoomInButton) {
    return;
  }

  const corkboardScreen = document.querySelector("#corkboard-screen");

  if (!corkboardScreen) {
    return;
  }

  const controls = document.createElement("div");
  controls.className = "mobile-viewer-controls";
  controls.id = "mobileViewerControls";
  controls.setAttribute("aria-label", "Controles de leitura");

  viewerPreviousFocus = createMobileControlButton("viewerPreviousFocus", "<", "Bloco conectado anterior");
  zoomOutButton = createMobileControlButton("zoomOutButton", "-", "Diminuir zoom");
  zoomInButton = createMobileControlButton("zoomInButton", "+", "Aumentar zoom");
  viewerNextFocus = createMobileControlButton("viewerNextFocus", ">", "Próximo bloco conectado");

  controls.append(viewerPreviousFocus, zoomOutButton, zoomInButton, viewerNextFocus);
  corkboardScreen.append(controls);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeJustificationTagsForTargets(text, targetIds) {
  return [...targetIds].reduce((nextText, targetId) => {
    const tagPattern = new RegExp(`\\[justify:${escapeRegExp(targetId)}\\]([\\s\\S]*?)\\[\\/justify\\]`, "gi");
    return nextText.replace(tagPattern, "$1");
  }, text || "");
}

function createFallbackData() {
  return {
    boards: [
      {
        id: "board-first-case",
        name: "Primeiro Mapa",
        blocks: [],
        connections: [],
      },
    ],
  };
}

async function loadData() {
  try {
    const response = await fetch(publishedDataPath, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const saved = await response.json();

    if (saved && Array.isArray(saved.boards)) {
      return saved;
    }
  } catch (error) {
    console.warn("Não foi possível carregar os mapas mentais publicados.", error);
  }

  return createFallbackData();
}

function loadSavedMode() {
  return true;
}

function loadDuplicateLineStyle() {
  return localStorage.getItem(lineStyleStorageKey) || "separate";
}

function loadRouteAroundBlocks() {
  return localStorage.getItem(routeAroundBlocksStorageKey) === "on";
}

function loadHideConnections() {
  return localStorage.getItem(hideConnectionsStorageKey) === "on";
}

function loadHideConnectionColors() {
  return localStorage.getItem(hideConnectionColorsStorageKey) === "on";
}

function loadHideTextColors() {
  return localStorage.getItem(hideTextColorsStorageKey) === "on";
}

function loadJustificationAnimation() {
  return localStorage.getItem(justificationAnimationStorageKey) !== "instant";
}

function saveData() {
  // Os dados publicados são somente leitura. O editor local cuida dos salvamentos.
}

function getCurrentBoard() {
  return state.data.boards.find((item) => item.id === state.currentBoardId) || null;
}

function normalizeConnectionColor(color) {
  if (colorValues[color]) {
    return color;
  }

  const colorEntry = Object.entries(colorValues).find((entry) => entry[1].toLowerCase() === String(color).toLowerCase());

  return colorEntry ? colorEntry[0] : "";
}

function getConnectionStroke(color = "") {
  const normalizedColor = normalizeConnectionColor(color);

  return normalizedColor ? colorValues[normalizedColor] : "#ffffff";
}

function getBlockCenter(block) {
  const width = block.width || 430;
  const height = block.height || 190;

  return {
    id: block.id,
    x: block.x + width / 2,
    y: block.y + height / 2,
  };
}

function getBlockBounds(block, padding = 0) {
  const width = block.width || 430;
  const height = block.height || 190;

  return {
    bottom: block.y + height + padding,
    left: block.x - padding,
    right: block.x + width + padding,
    top: block.y - padding,
  };
}

function getBlockEdgePoint(block, towardPoint) {
  const center = getBlockCenter(block);
  const width = block.width || 430;
  const height = block.height || 190;
  const dx = towardPoint.x - center.x;
  const dy = towardPoint.y - center.y;

  if (!dx && !dy) {
    return center;
  }

  const xScale = dx ? (width / 2) / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const yScale = dy ? (height / 2) / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(xScale, yScale);

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function segmentIntersectsBounds(start, end, bounds) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let min = 0;
  let max = 1;
  const checks = [
    [-dx, start.x - bounds.left],
    [dx, bounds.right - start.x],
    [-dy, start.y - bounds.top],
    [dy, bounds.bottom - start.y],
  ];

  return checks.every(([delta, distance]) => {
    if (Math.abs(delta) < 0.00001) {
      return distance >= 0;
    }

    const ratio = distance / delta;

    if (delta < 0) {
      if (ratio > max) {
        return false;
      }

      min = Math.max(min, ratio);
    } else {
      if (ratio < min) {
        return false;
      }

      max = Math.min(max, ratio);
    }

    return true;
  });
}

function pathIntersectsObstacles(points, obstacles) {
  return points.some((point, index) => {
    if (!index) {
      return false;
    }

    const previous = points[index - 1];
    return obstacles.some((obstacle) => segmentIntersectsBounds(previous, point, obstacle.bounds));
  });
}

function getPathLength(points) {
  return points.reduce((total, point, index) => {
    if (!index) {
      return total;
    }

    const previous = points[index - 1];
    return total + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}

function getConnectionNormal(startBlock, endBlock) {
  const points = [getBlockCenter(startBlock), getBlockCenter(endBlock)]
    .sort((left, right) => left.id.localeCompare(right.id));
  const dx = points[1].x - points[0].x;
  const dy = points[1].y - points[0].y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: -dy / length,
    y: dx / length,
  };
}

function getDuplicateOffset(duplicateIndex = 0, duplicateCount = 1) {
  const offsetStep = state.duplicateLineStyle === "separate" ? 14 : 10;
  return duplicateCount > 1 ? (duplicateIndex - (duplicateCount - 1) / 2) * offsetStep : 0;
}

function getVisibleConnectionObstacles(currentBoard, connectedBlockIds) {
  const connectedIds = new Set(connectedBlockIds);
  const availableBlocks = currentBoard.blocks.concat(state.pendingJustificationBlocks);

  return availableBlocks
    .filter((block) => !connectedIds.has(block.id) && shouldRenderBlock(block))
    .map((block) => ({
      block,
      bounds: getBlockBounds(block, 18),
    }));
}

function getOffsetEdgeSegment(startBlock, endBlock, normal, offset) {
  const startCenter = getBlockCenter(startBlock);
  const endCenter = getBlockCenter(endBlock);
  const shiftedStart = {
    x: startCenter.x + normal.x * offset,
    y: startCenter.y + normal.y * offset,
  };
  const shiftedEnd = {
    x: endCenter.x + normal.x * offset,
    y: endCenter.y + normal.y * offset,
  };

  return [
    getBlockEdgePoint(startBlock, shiftedEnd),
    getBlockEdgePoint(endBlock, shiftedStart),
  ];
}

function getDoglegCandidates(startBlock, endBlock, obstacles, normal, offset) {
  const [start, end] = getOffsetEdgeSegment(startBlock, endBlock, normal, offset);
  const startCenter = getBlockCenter(startBlock);
  const endCenter = getBlockCenter(endBlock);
  const blocker = obstacles
    .filter((obstacle) => segmentIntersectsBounds(start, end, obstacle.bounds))
    .sort((left, right) => (
      Math.hypot(getBlockCenter(left.block).x - startCenter.x, getBlockCenter(left.block).y - startCenter.y)
      - Math.hypot(getBlockCenter(right.block).x - startCenter.x, getBlockCenter(right.block).y - startCenter.y)
    ))[0];

  if (!blocker) {
    return [[start, end]];
  }

  const clearance = 34;
  const dx = Math.abs(endCenter.x - startCenter.x);
  const dy = Math.abs(endCenter.y - startCenter.y);

  if (dx >= dy) {
    return [
      [start, { x: start.x, y: blocker.bounds.top - clearance }, { x: end.x, y: blocker.bounds.top - clearance }, end],
      [start, { x: start.x, y: blocker.bounds.bottom + clearance }, { x: end.x, y: blocker.bounds.bottom + clearance }, end],
    ];
  }

  return [
    [start, { x: blocker.bounds.left - clearance, y: start.y }, { x: blocker.bounds.left - clearance, y: end.y }, end],
    [start, { x: blocker.bounds.right + clearance, y: start.y }, { x: blocker.bounds.right + clearance, y: end.y }, end],
  ];
}

function routeConnectionSegment(currentBoard, startBlock, endBlock, connectedBlockIds, duplicateIndex, duplicateCount) {
  const normal = getConnectionNormal(startBlock, endBlock);
  const baseOffset = getDuplicateOffset(duplicateIndex, duplicateCount);
  const obstacles = getVisibleConnectionObstacles(currentBoard, connectedBlockIds);
  const slideOffsets = [0, 34, -34, 68, -68, 112, -112, 160, -160, 220, -220]
    .map((offset) => baseOffset + offset);

  for (const offset of slideOffsets) {
    const candidate = getOffsetEdgeSegment(startBlock, endBlock, normal, offset);

    if (!pathIntersectsObstacles(candidate, obstacles)) {
      return candidate;
    }
  }

  const candidates = getDoglegCandidates(startBlock, endBlock, obstacles, normal, baseOffset);
  const cleanCandidate = candidates
    .filter((candidate) => !pathIntersectsObstacles(candidate, obstacles))
    .sort((left, right) => getPathLength(left) - getPathLength(right))[0];

  return cleanCandidate || candidates.sort((left, right) => getPathLength(left) - getPathLength(right))[0];
}

function getDefaultConnectionRoute(pointValues, duplicateIndex, duplicateCount) {
  if (pointValues.length !== 2) {
    return pointValues;
  }

  const [start, end] = pointValues;
  const canonicalPoints = [...pointValues].sort((left, right) => left.id.localeCompare(right.id));
  const canonicalDx = canonicalPoints[1].x - canonicalPoints[0].x;
  const canonicalDy = canonicalPoints[1].y - canonicalPoints[0].y;
  const canonicalLength = Math.hypot(canonicalDx, canonicalDy) || 1;
  const offset = getDuplicateOffset(duplicateIndex, duplicateCount);
  const offsetX = (-canonicalDy / canonicalLength) * offset;
  const offsetY = (canonicalDx / canonicalLength) * offset;

  return [
    { x: start.x + offsetX, y: start.y + offsetY },
    { x: end.x + offsetX, y: end.y + offsetY },
  ];
}

function getConnectionRoute(currentBoard, connectionBlocks, duplicateIndex, duplicateCount) {
  const pointValues = connectionBlocks.map(getBlockCenter);

  if (!state.routeAroundBlocks) {
    return getDefaultConnectionRoute(pointValues, duplicateIndex, duplicateCount);
  }

  return connectionBlocks.reduce((points, blockItem, index) => {
    if (!index) {
      return points;
    }

    const segmentPoints = routeConnectionSegment(
      currentBoard,
      connectionBlocks[index - 1],
      blockItem,
      connectionBlocks.map((block) => block.id),
      duplicateIndex,
      duplicateCount,
    );

    return points.concat(index === 1 ? segmentPoints : segmentPoints.slice(1));
  }, []);
}

function pathFromPoints(points) {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

function isJustificationBlock(block) {
  return Boolean(block?.justificationFor);
}

function isJustificationRevealed(blockId) {
  return state.revealedJustificationBlockIds.includes(blockId);
}

function shouldRenderBlock(block) {
  return !state.viewerMode || !isJustificationBlock(block) || isJustificationRevealed(block.id);
}

function getRoute() {
  if (!location.hash.startsWith("#corkboard/")) {
    return { blockId: "", boardId: "" };
  }

  const parts = location.hash.replace("#corkboard/", "").split("/");

  return {
    blockId: parts[1] ? decodeURIComponent(parts[1]) : "",
    boardId: parts[0] ? decodeURIComponent(parts[0]) : "",
  };
}

function setViewMode() {
  const route = getRoute();
  const previousBoardId = state.currentBoardId;
  const hasBoard = state.data.boards.some((item) => item.id === route.boardId);

  state.currentBoardId = hasBoard ? route.boardId : "";
  document.body.classList.toggle("show-corkboard", Boolean(state.currentBoardId));

  if (location.hash.startsWith("#corkboard") && !state.currentBoardId) {
    location.hash = "#welcome";
    return;
  }

  if (!route.blockId) {
    clearViewerFocus(false);
  }

  renderBoardMenu();
  renderBlocks();
  renderBoard();

  if (!state.currentBoardId) {
    return;
  }

  if (route.blockId) {
    if (state.viewerMode) {
      selectViewerBlock(route.blockId);
    } else {
      clearViewerFocus(false);
      focusBlockById(route.blockId);
    }
    return;
  }

  if (previousBoardId !== state.currentBoardId) {
    centerBoard();
  }
}

function renderBoardMenu() {
  boardMenu.innerHTML = "";

  if (!state.data.boards.length) {
    const emptyMessage = document.createElement("span");
    emptyMessage.className = "empty-board-list";
    emptyMessage.textContent = "Nenhum mapa mental ainda.";
    boardMenu.append(emptyMessage);
    populateLinkBuilder();
    return;
  }

  state.data.boards.forEach((item) => {
    const menuItem = document.createElement("div");
    const blockCount = Array.isArray(item.blocks) ? item.blocks.length : 0;
    const link = document.createElement("a");
    const thumbnail = document.createElement("div");
    const boardMeta = document.createElement("div");
    const boardName = document.createElement("strong");
    const boardCount = document.createElement("span");

    link.href = `#corkboard/${encodeURIComponent(item.id)}`;
    thumbnail.className = "board-thumbnail";

    if (item.thumbnail) {
      const image = document.createElement("img");
      image.src = item.thumbnail;
      image.alt = `${item.name} thumbnail`;
      thumbnail.append(image);
    } else {
      thumbnail.textContent = "Sem imagem";
    }

    boardMeta.className = "board-tile-meta";
    boardName.textContent = item.name;
    boardCount.textContent = `${blockCount} bloco${blockCount === 1 ? "" : "s"}`;
    boardMeta.append(boardName, boardCount);
    link.append(thumbnail, boardMeta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "board-delete-button danger-button dev-only";
    deleteButton.type = "button";
    deleteButton.textContent = "Apagar";
    deleteButton.setAttribute("aria-label", `Apagar ${item.name}`);
    deleteButton.addEventListener("click", () => {
      deleteBoardById(item.id);
    });

    menuItem.className = "board-menu-item";
    menuItem.append(link, deleteButton);
    boardMenu.append(menuItem);
  });

  populateLinkBuilder();
}

function renderBoard() {
  board.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;
  zoomOutButton.disabled = state.scale <= minZoom + 0.001;
  zoomInButton.disabled = state.scale >= maxZoom - 0.001;

  const currentBoard = getCurrentBoard();
  currentBoardName.textContent = currentBoard ? currentBoard.name : "Mapa mental";
}

function renderBlocks() {
  const currentBoard = getCurrentBoard();
  board.innerHTML = "";

  if (!currentBoard) {
    return;
  }

  renderConnections(currentBoard);

  const visibleBlocks = currentBoard.blocks.concat(state.pendingJustificationBlocks);

  visibleBlocks.forEach((block) => {
    const displayBlock = state.editingBlockId === block.id && state.editPreview
      ? { ...block, ...state.editPreview }
      : block;

    if (!shouldRenderBlock(displayBlock)) {
      return;
    }

    const card = document.createElement("article");
    const cardClasses = ["note-card"];

    if (isJustificationBlock(block)) {
      cardClasses.push("is-justification-block");
    }

    if (block.isPendingJustification) {
      cardClasses.push("is-pending-justification");
    }

    if (state.activeJustificationTargetBlockId === block.id) {
      cardClasses.push("is-justification-revealed");

      if (state.animateJustificationReveal) {
        cardClasses.push("is-justification-animated");
      }
    }

    if (state.selectedConnectionBlockIds.includes(block.id)) {
      cardClasses.push("is-selected-for-connection");
    }

    if (state.viewerMode && state.viewerFocusTargets.includes(block.id)) {
      cardClasses.push("is-viewer-related");
    }

    if (state.viewerMode && state.viewerFocusBaseBlockId === block.id) {
      cardClasses.push("is-viewer-main");
    }

    if (state.viewerMode && state.viewerFocusTargets[state.viewerFocusIndex] === block.id) {
      cardClasses.push("is-viewer-current");
    }

    card.className = cardClasses.join(" ");
    card.dataset.blockId = block.id;
    card.style.left = `${block.x}px`;
    card.style.top = `${block.y}px`;
    card.style.width = `${block.width || 430}px`;
    card.style.height = `${block.height || 190}px`;

    if (displayBlock.title) {
      const title = document.createElement("div");
      title.className = "note-title";
      title.textContent = displayBlock.title;
      card.append(title);
      card.classList.add("has-title");
    }

    const hasImage = Boolean(displayBlock.image);
    const hasText = Boolean((displayBlock.text || "").trim());
    const content = document.createElement("div");
    const contentClasses = ["note-content"];

    if (!hasImage) {
      contentClasses.push("no-image");
    }

    if (hasImage && !hasText) {
      contentClasses.push("image-only");
    }

    content.className = contentClasses.join(" ");

    if (hasImage) {
      const media = document.createElement("div");
      media.className = "note-media";
      const image = document.createElement("img");
      image.src = displayBlock.image;
      image.alt = displayBlock.imageName || "Attached clue";
      image.draggable = false;
      image.addEventListener("load", () => {
        updateCardOverflow(card);
      });
      media.append(image);
      content.append(media);
    }

    if (hasText || !hasImage) {
      const text = document.createElement("div");
      text.className = "note-text";
      renderBlockText(text, displayBlock.text || "");
      content.append(text);
    }

    card.append(content);

    if (!state.viewerMode && !block.isPendingJustification) {
      const resizeHandle = document.createElement("button");
      resizeHandle.className = "resize-handle";
      resizeHandle.type = "button";
      resizeHandle.setAttribute("aria-label", "Redimensionar bloco");

      const editButton = document.createElement("button");
      editButton.className = "edit-block-button";
      editButton.type = "button";
      editButton.setAttribute("aria-label", "Editar bloco");

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-block-button";
      deleteButton.type = "button";
      deleteButton.setAttribute("aria-label", "Apagar bloco");

      card.append(deleteButton, editButton, resizeHandle);
    }

    board.append(card);
    updateCardOverflow(card);
  });
}

function updateCardOverflow(card) {
  requestAnimationFrame(() => {
    card.querySelectorAll(".note-media, .note-text").forEach((area) => {
      area.classList.remove("has-overflow");

      const hasVerticalOverflow = area.scrollHeight > area.clientHeight + 4;
      const hasHorizontalOverflow = area.scrollWidth > area.clientWidth + 4;
      area.classList.toggle("has-overflow", hasVerticalOverflow || hasHorizontalOverflow);
    });
  });
}

function renderConnections(currentBoard = getCurrentBoard()) {
  const existingLayer = board.querySelector(".connection-layer");

  if (existingLayer) {
    existingLayer.remove();
  }

  if (!currentBoard) {
    return;
  }

  const layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  layer.classList.add("connection-layer");

  if (state.unconnectMode) {
    layer.classList.add("is-deleting");
  }

  layer.setAttribute("width", board.offsetWidth);
  layer.setAttribute("height", board.offsetHeight);
  layer.setAttribute("viewBox", `0 0 ${board.offsetWidth} ${board.offsetHeight}`);

  const visibleConnections = state.hideConnections ? [] : (currentBoard.connections || []).filter((connection) => (
    (connection.blockIds || []).length > 1 && connection.blockIds.every((blockId) => {
      const targetBlock = currentBoard.blocks.find((block) => block.id === blockId);
      return targetBlock && shouldRenderBlock(targetBlock);
    })
  ));

  const duplicateCounts = visibleConnections.reduce((counts, connection) => {
    const key = getConnectionKey(connection.blockIds);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const duplicateSeen = {};

  visibleConnections.forEach((connection) => {
    const key = getConnectionKey(connection.blockIds);
    const duplicateIndex = duplicateSeen[key] || 0;
    duplicateSeen[key] = duplicateIndex + 1;
    appendConnectionPolyline(
      layer,
      currentBoard,
      connection.blockIds,
      normalizeConnectionColor(connection.color),
      false,
      connection.id,
      duplicateIndex,
      duplicateCounts[key],
    );
  });

  if (state.connectionMode && state.selectedConnectionBlockIds.length > 1) {
    appendConnectionPolyline(
      layer,
      currentBoard,
      state.selectedConnectionBlockIds,
      connectionColor.value,
      true,
    );
  }

  appendJustificationRevealLine(layer, currentBoard);

  board.prepend(layer);
}

function appendJustificationRevealLine(layer, currentBoard) {
  const availableBlocks = currentBoard.blocks.concat(state.pendingJustificationBlocks);
  const sourceBlock = availableBlocks.find((block) => block.id === state.activeJustificationSourceBlockId);
  const targetBlock = availableBlocks.find((block) => block.id === state.activeJustificationTargetBlockId);

  if (!sourceBlock || !targetBlock || !shouldRenderBlock(sourceBlock) || !shouldRenderBlock(targetBlock)) {
    return;
  }

  const source = getBlockCenter(sourceBlock);
  const target = getBlockCenter(targetBlock);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.classList.add("justification-reveal-line");

  if (state.animateJustificationReveal) {
    line.classList.add("is-animated");
    line.setAttribute("pathLength", "1");
  }

  line.setAttribute("d", `M ${source.x} ${source.y} L ${target.x} ${target.y}`);
  layer.append(line);
}

function getConnectionKey(blockIds) {
  return [...blockIds].sort().join("|");
}

function appendConnectionPolyline(
  layer,
  currentBoard,
  blockIds,
  color = "",
  isPreview = false,
  connectionId = "",
  duplicateIndex = 0,
  duplicateCount = 1,
) {
  const connectionBlocks = blockIds
    .map((blockId) => currentBoard.blocks.find((block) => block.id === blockId))
    .filter(Boolean);

  if (connectionBlocks.length < 2) {
    return;
  }

  const pointValues = getConnectionRoute(currentBoard, connectionBlocks, duplicateIndex, duplicateCount);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.classList.add("connection-line");

  if (isPreview) {
    line.classList.add("is-preview");
  }

  if (state.duplicateLineStyle === "dotted" && duplicateCount > 1 && duplicateIndex % 2 === 1) {
    line.classList.add("is-alt-dotted");
  }

  if (state.viewerMode && state.viewerFocusBaseBlockId) {
    line.classList.add(blockIds.includes(state.viewerFocusBaseBlockId) ? "is-highlighted" : "is-dimmed");
  }

  if (connectionId) {
    line.dataset.connectionId = connectionId;
  }

  line.setAttribute("d", pathFromPoints(pointValues));

  const strokeColor = state.hideConnectionColors ? "#d6d6d6" : getConnectionStroke(color);
  line.style.color = strokeColor;
  line.setAttribute("stroke", strokeColor);
  layer.append(line);
}

function renderBlockText(container, value) {
  const lines = value.split(/\r?\n/);

  let list = null;

  lines.forEach((line) => {
    const bulletMatch = line.match(/^\s*-\s+(.*)$/);

    if (bulletMatch) {
      if (!list) {
        list = document.createElement("ul");
        container.append(list);
      }

      const item = document.createElement("li");
      const itemText = document.createElement("span");
      itemText.className = "list-item-text";
      appendFormattedText(itemText, bulletMatch[1]);
      if (itemText.childNodes.length) {
        item.append(itemText);
        list.append(item);
      }
      return;
    }

    list = null;

    if (!line.trim()) {
      return;
    }

    const paragraph = document.createElement("p");
    appendFormattedText(paragraph, line);
    if (paragraph.childNodes.length) {
      container.append(paragraph);
    }
  });
}

function appendFormattedText(container, value) {
  const colors = new Set(Object.keys(colorValues));
  const tagPattern = /\[(red|orange|yellow|blue|green|purple|cyan)\]([\s\S]*?)\[\/\1\]|\[goto:([^\]:]+)(?::([^\]]+))?\]([\s\S]*?)\[\/goto\]|\[justify:([^\]]+)\]([\s\S]*?)\[\/justify\]|\[size:(\d{1,2})\]([\s\S]*?)\[\/size\]/gi;
  let cursor = 0;
  let match = tagPattern.exec(value);

  while (match) {
    if (match.index > cursor) {
      container.append(document.createTextNode(value.slice(cursor, match.index)));
    }

    if (match[1]) {
      const color = match[1].toLowerCase();
      const span = document.createElement("span");

      if (colors.has(color)) {
        span.className = `text-${color}`;
      }

      appendFormattedText(span, match[2]);
      container.append(span);
    } else if (match[3]) {
      const boardId = match[3];
      const blockId = match[4] || "";
      const link = document.createElement("a");
      link.className = "board-link";
      link.href = `#corkboard/${encodeURIComponent(boardId)}${blockId ? `/${encodeURIComponent(blockId)}` : ""}`;
      link.textContent = match[5];
      container.append(link);
    } else if (match[6]) {
      const button = document.createElement("button");
      button.className = "justify-link";
      button.type = "button";
      button.dataset.justifyTarget = match[6];
      appendFormattedText(button, match[7]);
      container.append(button);
    } else if (match[8]) {
      const size = clamp(Number(match[8]), 10, 72);
      const span = document.createElement("span");
      span.className = "text-sized";
      span.style.fontSize = `${size}px`;
      appendFormattedText(span, match[9]);
      container.append(span);
    }

    cursor = tagPattern.lastIndex;
    match = tagPattern.exec(value);
  }

  if (cursor < value.length) {
    container.append(document.createTextNode(value.slice(cursor)));
  }
}

function centerBoard() {
  if (!viewport) {
    return;
  }

  state.x = (viewport.clientWidth - board.offsetWidth) / 2;
  state.y = (viewport.clientHeight - board.offsetHeight) / 2;
  renderBoard();
}

function getViewportPoint(event) {
  const rect = viewport.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function getPointerDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getPointerMidpoint(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function getBoardPointerPair() {
  return [...state.boardPointers.values()].slice(0, 2);
}

function startPinchZoom() {
  const [first, second] = getBoardPointerPair();

  if (!first || !second) {
    state.pinchZoom = null;
    return;
  }

  const center = getPointerMidpoint(first, second);
  const distance = Math.max(getPointerDistance(first, second), 1);

  state.pinchZoom = {
    boardX: (center.x - state.x) / state.scale,
    boardY: (center.y - state.y) / state.scale,
    distance,
    scale: state.scale,
  };

  state.boardPointers.forEach((pointer, pointerId) => {
    state.boardPointers.set(pointerId, {
      ...pointer,
      hasDraggedBoard: true,
    });
  });
}

function setZoomAtPoint(nextScale, pointerX = viewport.clientWidth / 2, pointerY = viewport.clientHeight / 2) {
  const previousScale = state.scale;
  const clampedScale = clamp(nextScale, minZoom, maxZoom);
  const boardX = (pointerX - state.x) / previousScale;
  const boardY = (pointerY - state.y) / previousScale;

  state.scale = clampedScale;
  state.x = pointerX - boardX * clampedScale;
  state.y = pointerY - boardY * clampedScale;
  renderBoard();
}

function zoomBoardBy(delta) {
  setZoomAtPoint(state.scale + delta);
}

function setSuppressNextBoardClick() {
  state.suppressNextBoardClick = true;
  window.clearTimeout(state.suppressNextBoardClickTimer);
  state.suppressNextBoardClickTimer = window.setTimeout(() => {
    state.suppressNextBoardClick = false;
  }, 400);
}

function startBoardDrag(event) {
  if (state.unconnectMode && event.target.closest(".connection-line")) {
    return;
  }

  const startedOnCard = Boolean(event.target.closest(".note-card"));
  const canStartOnCard = state.viewerMode && event.pointerType !== "mouse";

  if (
    (startedOnCard && !canStartOnCard)
    || event.target.closest(".board-toolbar")
    || event.target.closest(".block-panel")
    || event.target.closest(".settings-panel")
  ) {
    return;
  }

  if (!startedOnCard) {
    event.preventDefault();
  }

  const pointer = getViewportPoint(event);

  state.boardPointers.set(event.pointerId, {
    ...pointer,
    hasDraggedBoard: !startedOnCard,
    startX: pointer.x,
    startY: pointer.y,
    startedOnCard,
  });

  if (state.boardPointers.size >= 2) {
    event.preventDefault();
    state.isDraggingBoard = false;
    startPinchZoom();
    viewport.classList.add("is-dragging");
    return;
  }

  state.isDraggingBoard = true;
  state.lastX = pointer.x;
  state.lastY = pointer.y;
  viewport.classList.add("is-dragging");
  viewport.setPointerCapture(event.pointerId);
}

function dragBoard(event) {
  if (!state.boardPointers.has(event.pointerId)) {
    return;
  }

  const previousPointer = state.boardPointers.get(event.pointerId);
  const pointer = getViewportPoint(event);
  state.boardPointers.set(event.pointerId, {
    ...pointer,
    hasDraggedBoard: previousPointer.hasDraggedBoard,
    startX: previousPointer.startX,
    startY: previousPointer.startY,
    startedOnCard: previousPointer.startedOnCard,
  });

  if (state.pinchZoom && state.boardPointers.size >= 2) {
    event.preventDefault();
    const [first, second] = getBoardPointerPair();
    const center = getPointerMidpoint(first, second);
    const distance = Math.max(getPointerDistance(first, second), 1);
    const nextScale = state.pinchZoom.scale * (distance / state.pinchZoom.distance);

    state.scale = clamp(nextScale, minZoom, maxZoom);
    state.x = center.x - state.pinchZoom.boardX * state.scale;
    state.y = center.y - state.pinchZoom.boardY * state.scale;
    setSuppressNextBoardClick();
    renderBoard();
    return;
  }

  if (!state.isDraggingBoard) {
    return;
  }

  if (previousPointer.startedOnCard && !previousPointer.hasDraggedBoard) {
    const movement = Math.hypot(pointer.x - previousPointer.startX, pointer.y - previousPointer.startY);

    if (movement < cardDragStartThreshold) {
      state.lastX = pointer.x;
      state.lastY = pointer.y;
      return;
    }

    state.boardPointers.set(event.pointerId, {
      ...pointer,
      hasDraggedBoard: true,
      startX: previousPointer.startX,
      startY: previousPointer.startY,
      startedOnCard: previousPointer.startedOnCard,
    });
    setSuppressNextBoardClick();
  }

  state.x += pointer.x - state.lastX;
  state.y += pointer.y - state.lastY;
  state.lastX = pointer.x;
  state.lastY = pointer.y;
  renderBoard();
}

function stopBoardDrag(event) {
  if (viewport.hasPointerCapture(event.pointerId)) {
    viewport.releasePointerCapture(event.pointerId);
  }

  state.boardPointers.delete(event.pointerId);

  if (state.boardPointers.size >= 2) {
    startPinchZoom();
    return;
  }

  state.pinchZoom = null;

  if (state.boardPointers.size === 1) {
    const [remainingPointer] = state.boardPointers.values();
    state.isDraggingBoard = true;
    state.lastX = remainingPointer.x;
    state.lastY = remainingPointer.y;
    return;
  }

  state.isDraggingBoard = false;
  viewport.classList.remove("is-dragging");
}

function zoomBoard(event) {
  event.preventDefault();

  const pointer = getViewportPoint(event);
  const zoomDirection = event.deltaY > 0 ? -1 : 1;

  setZoomAtPoint(state.scale + zoomDirection * wheelZoomStep, pointer.x, pointer.y);
}

function startBlockDrag(event) {
  if (state.viewerMode) {
    return;
  }

  if (state.connectionMode) {
    return;
  }

  if (event.target.closest(".board-link") || event.target.closest(".justify-link")) {
    return;
  }

  if (event.target.closest(".edit-block-button") || event.target.closest(".delete-block-button")) {
    return;
  }

  if (startBlockResize(event)) {
    return;
  }

  const card = event.target.closest(".note-card");

  if (!card) {
    return;
  }

  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return;
  }

  const block = currentBoard.blocks.find((item) => item.id === card.dataset.blockId);

  if (!block) {
    return;
  }

  event.stopPropagation();
  state.draggedBlock = {
    block,
    card,
    lastX: event.clientX,
    lastY: event.clientY,
  };
  card.classList.add("is-dragging");
  card.setPointerCapture(event.pointerId);
}

function dragBlock(event) {
  if (state.resizedBlock) {
    resizeBlock(event);
    return;
  }

  if (!state.draggedBlock) {
    return;
  }

  const dragged = state.draggedBlock;
  dragged.block.x += (event.clientX - dragged.lastX) / state.scale;
  dragged.block.y += (event.clientY - dragged.lastY) / state.scale;
  dragged.lastX = event.clientX;
  dragged.lastY = event.clientY;
  dragged.card.style.left = `${dragged.block.x}px`;
  dragged.card.style.top = `${dragged.block.y}px`;
  renderConnections();
}

function stopBlockDrag(event) {
  if (stopBlockResize(event)) {
    return;
  }

  if (!state.draggedBlock) {
    return;
  }

  const dragged = state.draggedBlock;
  dragged.card.classList.remove("is-dragging");

  if (dragged.card.hasPointerCapture(event.pointerId)) {
    dragged.card.releasePointerCapture(event.pointerId);
  }

  state.draggedBlock = null;
  saveData();
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function getViewportCenterInBoard() {
  return {
    x: (viewport.clientWidth / 2 - state.x) / state.scale - 215,
    y: (viewport.clientHeight / 2 - state.y) / state.scale - 95,
  };
}

function startBlockResize(event) {
  const handle = event.target.closest(".resize-handle");

  if (!handle) {
    return false;
  }

  const card = handle.closest(".note-card");
  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return true;
  }

  const block = currentBoard.blocks.find((item) => item.id === card.dataset.blockId);

  if (!block) {
    return true;
  }

  event.stopPropagation();
  state.resizedBlock = {
    block,
    card,
    height: block.height || card.offsetHeight,
    lastX: event.clientX,
    lastY: event.clientY,
    width: block.width || card.offsetWidth,
  };
  card.classList.add("is-resizing");
  handle.setPointerCapture(event.pointerId);
  return true;
}

function resizeBlock(event) {
  if (!state.resizedBlock) {
    return;
  }

  const resized = state.resizedBlock;
  resized.width += (event.clientX - resized.lastX) / state.scale;
  resized.height += (event.clientY - resized.lastY) / state.scale;
  resized.lastX = event.clientX;
  resized.lastY = event.clientY;
  resized.block.width = Math.max(resized.width, 260);
  resized.block.height = Math.max(resized.height, 130);
  resized.card.style.width = `${resized.block.width}px`;
  resized.card.style.height = `${resized.block.height}px`;
  updateCardOverflow(resized.card);
  renderConnections();
}

function stopBlockResize(event) {
  if (!state.resizedBlock) {
    return false;
  }

  const resized = state.resizedBlock;
  resized.card.classList.remove("is-resizing");

  if (event.target.hasPointerCapture(event.pointerId)) {
    event.target.releasePointerCapture(event.pointerId);
  }

  state.resizedBlock = null;
  saveData();
  return true;
}

function findBlockById(blockId) {
  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return null;
  }

  return currentBoard.blocks.find((item) => item.id === blockId)
    || state.pendingJustificationBlocks.find((item) => item.id === blockId)
    || null;
}

function resetBlockForm() {
  state.editingBlockId = "";
  state.editPreview = null;
  state.pendingJustificationBlocks = [];
  blockForm.reset();
  blockPanelTitle.textContent = "Novo bloco";
  blockSubmitButton.textContent = "Colocar bloco";
  deleteBlockButton.hidden = true;
  currentImageNote.textContent = "Escolha uma imagem para adicionar ou substituir a imagem atual.";
  populateLinkBuilder();
  renderBlocks();
}

function openNewBlockForm() {
  resetBlockForm();
  blockPanel.classList.add("is-open");
  blockText.focus();
}

function openEditBlockForm(blockId) {
  const block = findBlockById(blockId);

  if (!block || block.isPendingJustification) {
    return;
  }

  state.pendingJustificationBlocks = [];
  state.editingBlockId = block.id;
  state.editPreview = {
    image: block.image || "",
    imageName: block.imageName || "",
    text: block.text || "",
    title: block.title || "",
  };
  blockForm.reset();
  blockTitle.value = block.title || "";
  blockText.value = block.text || "";
  blockPanelTitle.textContent = "Editar bloco";
  blockSubmitButton.textContent = "Salvar alterações";
  deleteBlockButton.hidden = false;
  currentImageNote.textContent = block.image
    ? `Imagem atual: ${block.imageName || "imagem anexada"}. Escolha outro arquivo para substituir.`
    : "Sem imagem atual. Escolha um arquivo para adicionar uma.";
  settingsPanel.classList.remove("is-open");
  toggleSettings.classList.remove("is-active");
  blockPanel.classList.add("is-open");
  blockText.focus();
}

function updateEditingPreview(changes = {}) {
  if (!state.editingBlockId) {
    return;
  }

  const block = findBlockById(state.editingBlockId);

  if (!block) {
    return;
  }

  state.editPreview = {
    image: block.image || "",
    imageName: block.imageName || "",
    text: block.text || "",
    ...(state.editPreview || {}),
    ...changes,
  };
  renderBlocks();
}

function hasUnsavedBlockFormChanges() {
  if (!blockPanel.classList.contains("is-open")) {
    return false;
  }

  if (!state.editingBlockId) {
    return Boolean(
      blockTitle.value.trim()
        || blockText.value.trim()
        || blockImage.files.length,
    );
  }

  const block = findBlockById(state.editingBlockId);

  if (!block) {
    return false;
  }

  return Boolean(
    blockTitle.value.trim() !== (block.title || "")
      || blockText.value !== (block.text || "")
      || blockImage.files.length
      || state.pendingJustificationBlocks.length,
  );
}

function confirmDiscardBlockFormChanges() {
  return !hasUnsavedBlockFormChanges()
    || confirm("Você tem alterações não salvas. Tem certeza que quer sair?");
}

function closeBlockForm({ confirmUnsaved = true } = {}) {
  if (confirmUnsaved && !confirmDiscardBlockFormChanges()) {
    return false;
  }

  resetBlockForm();
  blockPanel.classList.remove("is-open");
  return true;
}

function syncModeUi() {
  document.body.classList.toggle("viewer-mode", state.viewerMode);
  toggleMode.textContent = state.viewerMode ? "Modo edição" : "Modo leitor";
}

function syncSettingsUi() {
  duplicateLineStyle.value = state.duplicateLineStyle;
  routeAroundBlocks.checked = state.routeAroundBlocks;
  hideConnections.checked = state.hideConnections;
  hideConnectionColors.checked = state.hideConnectionColors;
  hideTextColors.checked = state.hideTextColors;
  document.body.classList.toggle("hide-text-colors", state.hideTextColors);
  animateJustificationReveal.checked = state.animateJustificationReveal;
}

function setAppMode() {
  state.viewerMode = true;
  syncModeUi();
  setConnectionMode(false);
  setUnconnectMode(false);

  renderBlocks();
  updateViewerCounter();
  return true;
}

function populateLinkBuilder() {
  if (!linkBoardSelect || !linkBlockSelect) {
    return;
  }

  const selectedBoardId = linkBoardSelect.value || state.currentBoardId || state.data.boards[0]?.id || "";
  linkBoardSelect.innerHTML = "";

  state.data.boards.forEach((boardItem) => {
    const option = document.createElement("option");
    option.value = boardItem.id;
    option.textContent = boardItem.name;
    linkBoardSelect.append(option);
  });

  if (state.data.boards.some((boardItem) => boardItem.id === selectedBoardId)) {
    linkBoardSelect.value = selectedBoardId;
  }

  populateLinkBlockOptions();
}

function populateLinkBlockOptions() {
  const targetBoard = state.data.boards.find((boardItem) => boardItem.id === linkBoardSelect.value);
  linkBlockSelect.innerHTML = "";

  const boardOnlyOption = document.createElement("option");
  boardOnlyOption.value = "";
  boardOnlyOption.textContent = "Mapa inteiro";
  linkBlockSelect.append(boardOnlyOption);

  if (!targetBoard) {
    return;
  }

  targetBoard.blocks.forEach((blockItem, index) => {
    const option = document.createElement("option");
    option.value = blockItem.id;
    option.textContent = getBlockLabel(blockItem, index);
    linkBlockSelect.append(option);
  });
}

function getBlockLabel(blockItem, index = 0) {
  if (blockItem.title?.trim()) {
    return blockItem.title.trim();
  }

  const plainText = (blockItem.text || "")
    .replace(/\[(?:red|orange|yellow|blue|green|purple|cyan)\]([\s\S]*?)\[\/(?:red|orange|yellow|blue|green|purple|cyan)\]/gi, "$1")
    .replace(/\[goto:[^\]]+\]([\s\S]*?)\[\/goto\]/gi, "$1")
    .replace(/\[justify:[^\]]+\]([\s\S]*?)\[\/justify\]/gi, "$1")
    .replace(/\[size:\d{1,2}\]([\s\S]*?)\[\/size\]/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return plainText ? plainText.slice(0, 32) : `Bloco ${index + 1}`;
}

function insertAtCursor(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
  input.focus();
  input.setSelectionRange(start + text.length, start + text.length);
  input.dispatchEvent(new Event("input"));
}

function insertWrappedText(openTag, closeTag) {
  const start = blockText.selectionStart ?? blockText.value.length;
  const end = blockText.selectionEnd ?? blockText.value.length;
  const selectedText = blockText.value.slice(start, end);
  const helperText = formatTextInput.value.trim();
  const innerText = selectedText || helperText || "texto";
  const insertText = `${openTag}${innerText}${closeTag}`;

  blockText.value = `${blockText.value.slice(0, start)}${insertText}${blockText.value.slice(end)}`;
  blockText.focus();
  blockText.setSelectionRange(start + openTag.length, start + openTag.length + innerText.length);
  formatTextInput.value = "";
  blockText.dispatchEvent(new Event("input"));
}

function createJustificationBlock() {
  const currentBoard = getCurrentBoard();
  const sourceBlock = findBlockById(state.editingBlockId);

  if (!currentBoard || !sourceBlock) {
    alert("Salve o bloco primeiro, depois edite para adicionar uma justificativa.");
    return;
  }

  const start = blockText.selectionStart ?? blockText.value.length;
  const end = blockText.selectionEnd ?? blockText.value.length;
  const selectedText = blockText.value.slice(start, end).trim();
  const helperText = formatTextInput.value.trim();
  const label = selectedText || helperText || "texto justificado";
  const justificationId = createId("justification");
  const sourceWidth = sourceBlock.width || 430;
  const sourceHeight = sourceBlock.height || 190;
  const titleText = label.length > 28 ? `${label.slice(0, 28)}...` : label;

  state.pendingJustificationBlocks.push({
    id: justificationId,
    height: 190,
    image: "",
    imageName: "",
    isPendingJustification: true,
    justificationFor: sourceBlock.id,
    text: "Add the supporting evidence here.",
    title: `Justificativa: ${titleText}`,
    width: 390,
    x: sourceBlock.x + sourceWidth + 70,
    y: sourceBlock.y + sourceHeight / 2 - 95,
  });

  insertAtCursor(blockText, `[justify:${justificationId}]${label}[/justify]`);
  formatTextInput.value = "";
  renderBlocks();
}

function focusBlockById(blockId, targetScale = 1.25) {
  const block = findBlockById(blockId);

  if (!block) {
    return;
  }

  const width = block.width || 430;
  const height = block.height || 190;
  state.scale = clamp(targetScale, minZoom, maxZoom);
  state.x = viewport.clientWidth / 2 - (block.x + width / 2) * state.scale;
  state.y = viewport.clientHeight / 2 - (block.y + height / 2) * state.scale;
  renderBoard();
}

function getConnectedBlockIds(blockId) {
  const currentBoard = getCurrentBoard();
  const connectedBlockIds = new Set();

  if (!currentBoard || !Array.isArray(currentBoard.connections)) {
    return [];
  }

  currentBoard.connections.forEach((connection) => {
    const connectionBlockIds = connection.blockIds || [];

    if (!connectionBlockIds.includes(blockId)) {
      return;
    }

    connectionBlockIds.forEach((connectedId) => {
      const connectedBlock = findBlockById(connectedId);

      if (connectedId !== blockId && connectedBlock && shouldRenderBlock(connectedBlock)) {
        connectedBlockIds.add(connectedId);
      }
    });
  });

  return [...connectedBlockIds];
}

function selectViewerBlock(blockId) {
  const block = findBlockById(blockId);

  if (!block) {
    return;
  }

  clearJustificationReveal(false);
  state.viewerFocusBaseBlockId = blockId;
  state.viewerFocusTargets = [blockId, ...getConnectedBlockIds(blockId)];
  state.viewerFocusIndex = 0;
  renderBlocks();
  focusBlockById(blockId);
  updateViewerCounter();
}

function revealJustificationBlock(targetBlockId, sourceBlockId = "") {
  const targetBlock = findBlockById(targetBlockId);

  if (!targetBlock) {
    return;
  }

  if (
    state.activeJustificationTargetBlockId === targetBlockId
    && state.activeJustificationSourceBlockId === sourceBlockId
  ) {
    clearJustificationReveal();
    return;
  }

  clearViewerFocus(false);
  state.activeJustificationSourceBlockId = sourceBlockId;
  state.activeJustificationTargetBlockId = targetBlockId;
  state.revealedJustificationBlockIds = [targetBlockId];
  renderBlocks();
  updateViewerCounter();
}

function clearJustificationReveal(shouldRender = true) {
  state.activeJustificationSourceBlockId = "";
  state.activeJustificationTargetBlockId = "";
  state.revealedJustificationBlockIds = [];

  if (shouldRender) {
    renderBlocks();
  }
}

function clearViewerFocus(shouldRender = true) {
  state.viewerFocusBaseBlockId = "";
  state.viewerFocusIndex = 0;
  state.viewerFocusTargets = [];
  clearJustificationReveal(false);
  updateViewerCounter();

  if (shouldRender) {
    renderBlocks();
  }
}

function stepViewerFocus(direction) {
  if (!state.viewerMode || !state.viewerFocusTargets.length) {
    return;
  }

  const total = state.viewerFocusTargets.length;
  state.viewerFocusIndex = (state.viewerFocusIndex + direction + total) % total;
  renderBlocks();
  focusBlockById(state.viewerFocusTargets[state.viewerFocusIndex]);
  updateViewerCounter();
}

function updateViewerCounter() {
  const total = state.viewerFocusTargets.length;
  const shouldShow = state.viewerMode && total > 0;
  const canStep = shouldShow && total > 1;

  viewerFocusCounter.hidden = !shouldShow;
  viewerPreviousFocus.disabled = !canStep;
  viewerNextFocus.disabled = !canStep;

  if (shouldShow) {
    viewerFocusCounter.textContent = `(${state.viewerFocusIndex + 1}/${total})`;
  }
}

function renameCurrentBoard() {
  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return;
  }

  const nextName = prompt("Renomear este mapa mental:", currentBoard.name);

  if (!nextName || !nextName.trim()) {
    return;
  }

  currentBoard.name = nextName.trim();
  saveData();
  renderBoardMenu();
  renderBoard();
}

async function updateCurrentBoardThumbnail(file) {
  const currentBoard = getCurrentBoard();

  if (!currentBoard || !file) {
    return;
  }

  currentBoard.thumbnail = await readImage(file);
  currentBoard.thumbnailName = file.name;
  saveData();
  renderBoardMenu();
}

function closeFloatingPanels() {
  blockPanel.classList.remove("is-open");
  settingsPanel.classList.remove("is-open");
  toggleSettings.classList.remove("is-active");
  state.connectionMode = false;
  state.unconnectMode = false;
  state.editingBlockId = "";
  state.editPreview = null;
  state.selectedConnectionBlockIds = [];
  state.draggedBlock = null;
  state.resizedBlock = null;
  toggleConnectMode.textContent = "Conectar";
  toggleConnectMode.classList.remove("is-active");
  toggleUnconnectMode.classList.remove("is-active");
  connectionColor.disabled = false;
  clearViewerFocus(false);
}

function deleteBoardById(boardId) {
  const boardIndex = state.data.boards.findIndex((boardItem) => boardItem.id === boardId);

  if (boardIndex === -1) {
    return;
  }

  const boardItem = state.data.boards[boardIndex];
  const blockCount = Array.isArray(boardItem.blocks) ? boardItem.blocks.length : 0;
  const shouldDelete = confirm(
    `Apagar o mapa mental "${boardItem.name}"? Isso também apaga ${blockCount} bloco${blockCount === 1 ? "" : "s"} e todas as conexões dele.`,
  );

  if (!shouldDelete) {
    return;
  }

  const isCurrentBoard = state.currentBoardId === boardId || getRoute().boardId === boardId;
  state.data.boards.splice(boardIndex, 1);
  closeFloatingPanels();
  saveData();
  renderBoardMenu();
  populateLinkBuilder();

  if (isCurrentBoard) {
    state.currentBoardId = "";

    if (location.hash === "#welcome") {
      setViewMode();
    } else {
      location.hash = "#welcome";
    }

    return;
  }

  renderBlocks();
  renderBoard();
}

function deleteCurrentBoard() {
  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return;
  }

  deleteBoardById(currentBoard.id);
}

function deleteBlockById(blockId) {
  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return;
  }

  const blockIndex = currentBoard.blocks.findIndex((blockItem) => blockItem.id === blockId);

  if (blockIndex === -1) {
    return;
  }

  const blockItem = currentBoard.blocks[blockIndex];
  const blockLabel = getBlockLabel(blockItem, blockIndex);
  const relatedJustificationIds = currentBoard.blocks
    .filter((childBlock) => childBlock.justificationFor === blockId)
    .map((childBlock) => childBlock.id);
  const deletedBlockIds = new Set([blockId, ...relatedJustificationIds]);
  const connectionCount = (currentBoard.connections || [])
    .filter((connection) => (connection.blockIds || []).some((connectionBlockId) => deletedBlockIds.has(connectionBlockId)))
    .length;
  const connectionText = connectionCount
    ? ` Isso também remove ${connectionCount} ${connectionCount === 1 ? "conexão" : "conexões"}.`
    : "";
  const justificationText = relatedJustificationIds.length
    ? ` Isso também remove ${relatedJustificationIds.length} bloco${relatedJustificationIds.length === 1 ? "" : "s"} oculto${relatedJustificationIds.length === 1 ? "" : "s"} de justificativa.`
    : "";
  const shouldDelete = confirm(`Apagar o bloco "${blockLabel}"?${connectionText}${justificationText}`);

  if (!shouldDelete) {
    return;
  }

  const route = getRoute();
  const shouldClearRouteBlock = route.boardId === currentBoard.id && deletedBlockIds.has(route.blockId);

  currentBoard.blocks = currentBoard.blocks
    .filter((block) => !deletedBlockIds.has(block.id))
    .map((block) => ({
      ...block,
      text: removeJustificationTagsForTargets(block.text, deletedBlockIds),
    }));
  currentBoard.connections = (currentBoard.connections || [])
    .filter((connection) => !(connection.blockIds || []).some((connectionBlockId) => deletedBlockIds.has(connectionBlockId)));
  state.selectedConnectionBlockIds = state.selectedConnectionBlockIds.filter((selectedId) => !deletedBlockIds.has(selectedId));
  state.pendingJustificationBlocks = state.pendingJustificationBlocks.filter((block) => !deletedBlockIds.has(block.id));
  state.revealedJustificationBlockIds = state.revealedJustificationBlockIds.filter((selectedId) => !deletedBlockIds.has(selectedId));

  if (
    deletedBlockIds.has(state.activeJustificationSourceBlockId)
    || deletedBlockIds.has(state.activeJustificationTargetBlockId)
  ) {
    clearJustificationReveal(false);
  }

  if (deletedBlockIds.has(state.editingBlockId)) {
    resetBlockForm();
    blockPanel.classList.remove("is-open");
  }

  if (state.viewerFocusTargets.some((selectedId) => deletedBlockIds.has(selectedId))) {
    clearViewerFocus(false);
  }

  saveData();
  renderBoardMenu();
  populateLinkBuilder();

  if (shouldClearRouteBlock) {
    location.hash = `#corkboard/${encodeURIComponent(currentBoard.id)}`;
    return;
  }

  renderBlocks();
}

function ensureBoardConnections(currentBoard) {
  if (!Array.isArray(currentBoard.connections)) {
    currentBoard.connections = [];
  }
}

function setConnectionMode(isActive) {
  state.connectionMode = isActive;
  state.unconnectMode = false;
  state.selectedConnectionBlockIds = [];
  toggleConnectMode.textContent = isActive ? "Parar" : "Conectar";
  toggleConnectMode.classList.toggle("is-active", isActive);
  toggleUnconnectMode.classList.remove("is-active");
  connectionColor.disabled = false;
  renderBlocks();
}

function setUnconnectMode(isActive) {
  state.unconnectMode = isActive;
  state.connectionMode = false;
  state.selectedConnectionBlockIds = [];
  toggleUnconnectMode.classList.toggle("is-active", isActive);
  toggleConnectMode.textContent = "Conectar";
  toggleConnectMode.classList.remove("is-active");
  connectionColor.disabled = false;
  renderBlocks();
}

function addBlockToPendingConnection(blockId) {
  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return;
  }

  if (!state.selectedConnectionBlockIds.length) {
    state.selectedConnectionBlockIds = [blockId];
    renderBlocks();
    return;
  }

  const firstBlockId = state.selectedConnectionBlockIds[0];

  if (firstBlockId === blockId) {
    state.selectedConnectionBlockIds = [];
    renderBlocks();
    return;
  }

  ensureBoardConnections(currentBoard);
  currentBoard.connections.push({
    id: createId("connection"),
    blockIds: [firstBlockId, blockId],
    color: normalizeConnectionColor(connectionColor.value),
  });
  state.selectedConnectionBlockIds = [blockId];
  saveData();
  renderBlocks();
}

function deleteConnection(connectionId) {
  const currentBoard = getCurrentBoard();

  if (!currentBoard || !Array.isArray(currentBoard.connections)) {
    return;
  }

  currentBoard.connections = currentBoard.connections.filter((connection) => connection.id !== connectionId);
  saveData();
  renderBlocks();
}

newBoardForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = newBoardName.value.trim() || "Mapa sem título";
  const thumbnailFile = newBoardThumbnail.files[0];
  const boardItem = {
    id: createId("board"),
    name,
    blocks: [],
    connections: [],
    thumbnail: thumbnailFile ? await readImage(thumbnailFile) : "",
    thumbnailName: thumbnailFile ? thumbnailFile.name : "",
  };

  state.data.boards.push(boardItem);
  saveData();
  newBoardForm.reset();
  renderBoardMenu();
  location.hash = `#corkboard/${encodeURIComponent(boardItem.id)}`;
});

toggleMode.addEventListener("click", () => {
  setAppMode(!state.viewerMode);
});

renameBoardButton.addEventListener("click", renameCurrentBoard);
changeBoardThumbnailButton.addEventListener("click", () => {
  boardThumbnailInput.click();
});

boardThumbnailInput.addEventListener("change", async () => {
  await updateCurrentBoardThumbnail(boardThumbnailInput.files[0]);
  boardThumbnailInput.value = "";
});

deleteBoardButton.addEventListener("click", deleteCurrentBoard);

toggleSettings.addEventListener("click", () => {
  settingsPanel.classList.toggle("is-open");
  toggleSettings.classList.toggle("is-active", settingsPanel.classList.contains("is-open"));
});

closeSettings.addEventListener("click", () => {
  settingsPanel.classList.remove("is-open");
  toggleSettings.classList.remove("is-active");
});

duplicateLineStyle.addEventListener("change", () => {
  state.duplicateLineStyle = duplicateLineStyle.value;
  localStorage.setItem(lineStyleStorageKey, state.duplicateLineStyle);
  renderBlocks();
});

routeAroundBlocks.addEventListener("change", () => {
  state.routeAroundBlocks = routeAroundBlocks.checked;
  localStorage.setItem(routeAroundBlocksStorageKey, state.routeAroundBlocks ? "on" : "off");
  renderBlocks();
});

hideConnections.addEventListener("change", () => {
  state.hideConnections = hideConnections.checked;
  localStorage.setItem(hideConnectionsStorageKey, state.hideConnections ? "on" : "off");
  renderBlocks();
});

hideConnectionColors.addEventListener("change", () => {
  state.hideConnectionColors = hideConnectionColors.checked;
  localStorage.setItem(hideConnectionColorsStorageKey, state.hideConnectionColors ? "on" : "off");
  renderConnections();
});

hideTextColors.addEventListener("change", () => {
  state.hideTextColors = hideTextColors.checked;
  localStorage.setItem(hideTextColorsStorageKey, state.hideTextColors ? "on" : "off");
  document.body.classList.toggle("hide-text-colors", state.hideTextColors);
});

animateJustificationReveal.addEventListener("change", () => {
  state.animateJustificationReveal = animateJustificationReveal.checked;
  localStorage.setItem(
    justificationAnimationStorageKey,
    state.animateJustificationReveal ? "animated" : "instant",
  );
  renderBlocks();
});

linkBoardSelect.addEventListener("change", () => {
  populateLinkBlockOptions();
});

insertColorButton.addEventListener("click", () => {
  insertWrappedText(`[${formatColorSelect.value}]`, `[/${formatColorSelect.value}]`);
});

insertSizeButton.addEventListener("click", () => {
  insertWrappedText(`[size:${formatSizeSelect.value}]`, "[/size]");
});

insertJustifyButton.addEventListener("click", createJustificationBlock);

insertLinkButton.addEventListener("click", () => {
  const targetBoard = state.data.boards.find((boardItem) => boardItem.id === linkBoardSelect.value);

  if (!targetBoard) {
    return;
  }

  const targetBlock = targetBoard.blocks.find((blockItem) => blockItem.id === linkBlockSelect.value);
  const fallbackText = targetBlock
    ? getBlockLabel(targetBlock, targetBoard.blocks.indexOf(targetBlock))
    : targetBoard.name;
  const selectedText = blockText.value.slice(blockText.selectionStart ?? 0, blockText.selectionEnd ?? 0);
  const linkText = formatTextInput.value.trim() || selectedText || fallbackText;
  const target = targetBlock ? `${targetBoard.id}:${targetBlock.id}` : targetBoard.id;

  insertAtCursor(blockText, `[goto:${target}]${linkText}[/goto]`);
  formatTextInput.value = "";
});

toggleBlockForm.addEventListener("click", () => {
  if (state.connectionMode) {
    setConnectionMode(false);
  }

  if (state.unconnectMode) {
    setUnconnectMode(false);
  }

  if (blockPanel.classList.contains("is-open")) {
    const wasEditingBlock = Boolean(state.editingBlockId);

    if (!closeBlockForm()) {
      return;
    }

    if (!wasEditingBlock) {
      return;
    }
  }

  settingsPanel.classList.remove("is-open");
  toggleSettings.classList.remove("is-active");
  openNewBlockForm();
});

toggleConnectMode.addEventListener("click", () => {
  if (state.connectionMode) {
    setConnectionMode(false);
    return;
  }

  if (!closeBlockForm()) {
    return;
  }

  settingsPanel.classList.remove("is-open");
  toggleSettings.classList.remove("is-active");
  setConnectionMode(true);
});

toggleUnconnectMode.addEventListener("click", () => {
  if (!closeBlockForm()) {
    return;
  }

  settingsPanel.classList.remove("is-open");
  toggleSettings.classList.remove("is-active");
  setUnconnectMode(!state.unconnectMode);
});

connectionColor.addEventListener("change", () => {
  renderConnections();
});

cancelBlockEdit.addEventListener("click", () => {
  closeBlockForm();
});

deleteBlockButton.addEventListener("click", () => {
  if (state.editingBlockId) {
    deleteBlockById(state.editingBlockId);
  }
});

blockText.addEventListener("input", () => {
  updateEditingPreview({ text: blockText.value });
});

blockTitle.addEventListener("input", () => {
  updateEditingPreview({ title: blockTitle.value.trim() });
});

blockImage.addEventListener("change", async () => {
  const imageFile = blockImage.files[0];

  if (!state.editingBlockId || !imageFile) {
    return;
  }

  updateEditingPreview({
    image: await readImage(imageFile),
    imageName: imageFile.name,
  });
});

board.addEventListener("click", (event) => {
  if (state.suppressNextBoardClick) {
    event.preventDefault();
    event.stopPropagation();
    state.suppressNextBoardClick = false;
    window.clearTimeout(state.suppressNextBoardClickTimer);
    return;
  }

  const justifyLink = event.target.closest(".justify-link");

  if (justifyLink) {
    event.preventDefault();
    event.stopPropagation();
    revealJustificationBlock(
      justifyLink.dataset.justifyTarget,
      justifyLink.closest(".note-card")?.dataset.blockId || "",
    );
    return;
  }

  if (event.target.closest(".board-link")) {
    return;
  }

  const line = event.target.closest(".connection-line");

  if (state.unconnectMode && line?.dataset.connectionId) {
    event.stopPropagation();
    deleteConnection(line.dataset.connectionId);
    return;
  }

  const card = event.target.closest(".note-card");
  const deleteButton = event.target.closest(".delete-block-button");
  const editButton = event.target.closest(".edit-block-button");
  const activeJustificationTargetId = state.activeJustificationTargetBlockId;

  if (activeJustificationTargetId && !deleteButton && !editButton) {
    if (!card) {
      clearJustificationReveal();
      return;
    }

    if (card.dataset.blockId === activeJustificationTargetId) {
      event.stopPropagation();
      return;
    }

    clearJustificationReveal(false);
  }

  if (deleteButton) {
    event.stopPropagation();
    deleteBlockById(deleteButton.closest(".note-card").dataset.blockId);
    return;
  }

  if (editButton) {
    const targetBlockId = editButton.closest(".note-card").dataset.blockId;

    if (blockPanel.classList.contains("is-open")) {
      if (state.editingBlockId === targetBlockId) {
        blockText.focus();
        return;
      }

      if (!closeBlockForm()) {
        return;
      }
    }

    event.stopPropagation();
    openEditBlockForm(targetBlockId);
    return;
  }

  if (state.viewerMode && card) {
    event.stopPropagation();
    selectViewerBlock(card.dataset.blockId);
    return;
  }

  if (state.connectionMode && card) {
    event.stopPropagation();
    addBlockToPendingConnection(card.dataset.blockId);
    return;
  }
});

blockForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currentBoard = getCurrentBoard();

  if (!currentBoard) {
    return;
  }

  const text = blockText.value.trim();
  const title = blockTitle.value.trim();
  const imageFile = blockImage.files[0];

  const image = await readImage(imageFile);

  if (state.editingBlockId) {
    const block = findBlockById(state.editingBlockId);

    if (!block) {
      return;
    }

    block.text = text;
    block.title = title;

    if (imageFile) {
      block.image = image;
      block.imageName = imageFile.name;
    }

    const pendingJustificationsToSave = state.pendingJustificationBlocks
      .filter((pendingBlock) => blockText.value.includes(`[justify:${pendingBlock.id}]`));

    if (pendingJustificationsToSave.length) {
      currentBoard.blocks.push(...pendingJustificationsToSave.map((pendingBlock) => {
        const { isPendingJustification, ...savedBlock } = pendingBlock;
        return savedBlock;
      }));
    }

    state.pendingJustificationBlocks = [];
    saveData();
    resetBlockForm();
    blockPanel.classList.remove("is-open");
    populateLinkBuilder();
    renderBlocks();
    return;
  }

  if (!text && !imageFile) {
    return;
  }

  const position = getViewportCenterInBoard();

  currentBoard.blocks.push({
    id: createId("block"),
    height: 190,
    image,
    imageName: imageFile ? imageFile.name : "",
    text,
    title,
    width: 430,
    x: position.x,
    y: position.y,
  });

  saveData();
  resetBlockForm();
  blockPanel.classList.remove("is-open");
  renderBoardMenu();
  populateLinkBuilder();
  renderBlocks();
});

window.addEventListener("hashchange", setViewMode);
window.addEventListener("resize", renderBoard);
window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedBlockFormChanges()) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
});
window.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement?.tagName;

  if (!state.viewerMode || ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    stepViewerFocus(1);
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    stepViewerFocus(-1);
  }

  if (event.key === "Escape") {
    clearViewerFocus();
  }
});

viewerPreviousFocus.addEventListener("click", () => {
  stepViewerFocus(-1);
});

viewerNextFocus.addEventListener("click", () => {
  stepViewerFocus(1);
});

zoomOutButton.addEventListener("click", () => {
  zoomBoardBy(-buttonZoomStep);
});

zoomInButton.addEventListener("click", () => {
  zoomBoardBy(buttonZoomStep);
});

viewport.addEventListener("pointerdown", startBoardDrag);
viewport.addEventListener("pointermove", dragBoard);
viewport.addEventListener("pointerup", stopBoardDrag);
viewport.addEventListener("pointercancel", stopBoardDrag);
viewport.addEventListener("wheel", zoomBoard, { passive: false });

board.addEventListener("pointerdown", startBlockDrag);
board.addEventListener("pointermove", dragBlock);
board.addEventListener("pointerup", stopBlockDrag);
board.addEventListener("pointercancel", stopBlockDrag);

async function initViewer() {
  state.data = await loadData();

  if (!location.hash) {
    location.hash = "#welcome";
  }

  renderBoardMenu();
  syncModeUi();
  syncSettingsUi();
  setViewMode();
}

initViewer();
