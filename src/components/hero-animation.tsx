'use client';

import { useEffect, useRef } from 'react';

interface Tetromino {
  colors: string[];
  data: number[][];
}

const tetrominos: Tetromino[] = [
  {
    // box
    colors: ['rgb(59,84,165)', 'rgb(118,137,196)', 'rgb(79,111,182)'],
    data: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    // stick
    colors: ['rgb(214,30,60)', 'rgb(241,108,107)', 'rgb(236,42,75)'],
    data: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
  },
  {
    // z
    colors: ['rgb(88,178,71)', 'rgb(150,204,110)', 'rgb(115,191,68)'],
    data: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 1],
      [0, 0, 0, 0],
    ],
  },
  {
    // T
    colors: ['rgb(62,170,212)', 'rgb(120,205,244)', 'rgb(54,192,240)'],
    data: [
      [0, 0, 0, 0],
      [0, 1, 1, 1],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    // s
    colors: ['rgb(236,94,36)', 'rgb(234,154,84)', 'rgb(228,126,37)'],
    data: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    // backwards L
    colors: ['rgb(220,159,39)', 'rgb(246,197,100)', 'rgb(242,181,42)'],
    data: [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    // L
    colors: ['rgb(158,35,126)', 'rgb(193,111,173)', 'rgb(179,63,151)'],
    data: [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
];

class Tetris {
  posX: number;
  posY: number;
  width: number;
  height: number;
  bgCanvas: HTMLCanvasElement;
  fgCanvas: HTMLCanvasElement;
  bgCtx: CanvasRenderingContext2D;
  fgCtx: CanvasRenderingContext2D;
  curPiece!: {
    data: number[][] | null;
    colors: string[];
    x: number;
    y: number;
  };
  lastMove!: number;
  curSpeed!: number;
  unitSize!: number;
  linesCleared!: number;
  level!: number;
  loseBlock!: number;
  board!: Array<Array<{ data: number; colors: string[] }>>;
  boardWidth!: number;
  boardHeight!: number;
  container: HTMLElement;
  isActive: boolean;
  animationFrameId: number | null;

  constructor(x: number, y: number, width: number, height: number, container: HTMLElement) {
    this.posX = x || 0;
    this.posY = y || 0;
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    this.container = container;
    this.isActive = true;
    this.animationFrameId = null;

    this.bgCanvas = document.createElement('canvas');
    this.fgCanvas = document.createElement('canvas');

    this.bgCanvas.width = this.fgCanvas.width = this.width;
    this.bgCanvas.height = this.fgCanvas.height = this.height;

    this.bgCtx = this.bgCanvas.getContext('2d')!;
    this.fgCtx = this.fgCanvas.getContext('2d')!;

    this.bgCanvas.style.position = 'absolute';
    this.bgCanvas.style.left = this.posX + 'px';
    this.bgCanvas.style.top = this.posY + 'px';
    this.bgCanvas.style.pointerEvents = 'none';

    this.fgCanvas.style.position = 'absolute';
    this.fgCanvas.style.left = this.posX + 'px';
    this.fgCanvas.style.top = this.posY + 'px';
    this.fgCanvas.style.pointerEvents = 'none';

    container.appendChild(this.bgCanvas);
    container.appendChild(this.fgCanvas);
    this.init();
  }

  init() {
    this.curPiece = {
      data: null,
      colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'],
      x: 0,
      y: 0,
    };

    this.lastMove = Date.now();
    this.curSpeed = 50 + Math.random() * 50;
    this.unitSize = 20;
    this.linesCleared = 0;
    this.level = 0;
    this.loseBlock = 0;

    // init the board
    this.board = [];
    this.boardWidth = Math.floor(this.width / this.unitSize);
    this.boardHeight = Math.floor(this.height / this.unitSize);

    const board = this.board;
    const boardWidth = this.boardWidth;
    const boardHeight = this.boardHeight;
    const halfHeight = boardHeight / 2;
    const curPiece = this.curPiece;
    let x = 0;
    let y = 0;

    // init board
    for (x = 0; x <= boardWidth; x++) {
      board[x] = [];
      for (y = 0; y <= boardHeight; y++) {
        board[x][y] = {
          data: 0,
          colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'],
        };

        if (Math.random() > 0.15 && y > halfHeight) {
          board[x][y] = {
            data: 1,
            colors: tetrominos[Math.floor(Math.random() * tetrominos.length)].colors,
          };
        }
      }
    }

    // collapse the board a bit
    for (x = 0; x <= boardWidth; x++) {
      for (y = boardHeight - 1; y > -1; y--) {
        if (board[x][y].data === 0 && y > 0) {
          for (let yy = y; yy > 0; yy--) {
            if (board[x][yy - 1].data) {
              board[x][yy].data = 1;
              board[x][yy].colors = board[x][yy - 1].colors;

              board[x][yy - 1].data = 0;
              board[x][yy - 1].colors = ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'];
            }
          }
        }
      }
    }

    // render the board
    this.checkLines();
    this.renderBoard();

    // assign the first tetri
    this.newTetromino();
    this.update();
  }

  update() {
    if (!this.isActive) return;

    const curPiece = this.curPiece;

    if (!curPiece.data) {
      this.newTetromino();
      this.render();
      if (this.isActive) {
        const self = this;
        this.animationFrameId = requestAnimationFrame(() => {
          self.update();
        });
      }
      return;
    }

    if (!this.checkMovement(curPiece, 0, 1)) {
      if (curPiece.y < -1) {
        // you lose
        this.loseScreen();
        return true;
      } else {
        this.fillBoard(curPiece);
        this.newTetromino();
      }
    } else {
      if (Date.now() > this.lastMove) {
        this.lastMove = Date.now() + this.curSpeed;
        if (this.checkMovement(curPiece, 0, 1)) {
          curPiece.y++;
        } else {
          this.fillBoard(curPiece);
          this.newTetromino();
        }
      }
    }

    this.render();

    if (this.isActive) {
      const self = this;
      this.animationFrameId = requestAnimationFrame(() => {
        self.update();
      });
    }
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // render only the board.
  renderBoard() {
    const canvas = this.bgCanvas;
    const ctx = this.bgCtx;
    const unitSize = this.unitSize;
    const board = this.board;
    const boardWidth = this.boardWidth;
    const boardHeight = this.boardHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x <= boardWidth; x++) {
      for (let y = 0; y <= boardHeight; y++) {
        if (board[x][y].data !== 0) {
          const bX = x * unitSize;
          const bY = y * unitSize;

          ctx.fillStyle = board[x][y].colors[0];
          ctx.fillRect(bX, bY, unitSize, unitSize);

          ctx.fillStyle = board[x][y].colors[1];
          ctx.fillRect(bX + 2, bY + 2, unitSize - 4, unitSize - 4);

          ctx.fillStyle = board[x][y].colors[2];
          ctx.fillRect(bX + 4, bY + 4, unitSize - 8, unitSize - 8);
        }
      }
    }
  }

  // Render the current active piece
  render() {
    const canvas = this.fgCanvas;
    const ctx = this.fgCtx;
    const unitSize = this.unitSize;
    const curPiece = this.curPiece;

    if (!curPiece.data) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (curPiece.data[x][y] === 1) {
          const xPos = (curPiece.x + x) * unitSize;
          const yPos = (curPiece.y + y) * unitSize;

          if (yPos > -1) {
            ctx.fillStyle = curPiece.colors[0];
            ctx.fillRect(xPos, yPos, unitSize, unitSize);

            ctx.fillStyle = curPiece.colors[1];
            ctx.fillRect(xPos + 2, yPos + 2, unitSize - 4, unitSize - 4);

            ctx.fillStyle = curPiece.colors[2];
            ctx.fillRect(xPos + 4, yPos + 4, unitSize - 8, unitSize - 8);
          }
        }
      }
    }
  }

  // Make sure we can mov where we want.
  checkMovement(curPiece: { data: number[][] | null; x: number; y: number }, newX: number, newY: number) {
    if (!curPiece.data) return false;
    
    const piece = curPiece.data;
    const posX = curPiece.x;
    const posY = curPiece.y;
    const board = this.board;
    const boardWidth = this.boardWidth;
    const boardHeight = this.boardHeight;

    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (piece[x][y] === 1) {
          if (!board[posX + x + newX]) {
            board[posX + x + newX] = [];
          }

          if (!board[posX + x + newX][y + posY + newY]) {
            board[posX + x + newX][y + posY + newY] = {
              data: 0,
              colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'],
            };
          }

          if (
            posX + x + newX >= boardWidth ||
            posX + x + newX < 0 ||
            board[posX + x + newX][y + posY + newY].data == 1
          ) {
            return false;
          }

          if (posY + y + newY > boardHeight) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // checks for completed lines and clears them
  checkLines() {
    const board = this.board;
    const boardWidth = this.boardWidth;
    const boardHeight = this.boardHeight;
    let linesCleared = this.linesCleared;
    let level = this.level;
    let y = boardHeight + 1;

    while (y--) {
      let x = boardWidth;
      let lines = 0;

      while (x--) {
        if (board[x][y].data === 1) {
          lines++;
        }
      }

      if (lines === boardWidth) {
        linesCleared++;
        level = Math.round(linesCleared / 20) * 20;

        let lineY = y;
        while (lineY) {
          for (x = 0; x <= boardWidth; x++) {
            if (lineY - 1 > 0) {
              board[x][lineY].data = board[x][lineY - 1].data;
              board[x][lineY].colors = board[x][lineY - 1].colors;
            }
          }
          lineY--;
        }
        y++;
      }
    }
  }

  // Lose animation
  loseScreen() {
    const ctx = this.bgCtx;
    const unitSize = this.unitSize;
    const boardWidth = this.boardWidth;
    const boardHeight = this.boardHeight;
    const y = boardHeight - this.loseBlock;

    for (let x = 0; x < boardWidth; x++) {
      const bX = x * unitSize;
      const bY = y * unitSize;

      ctx.fillStyle = 'rgb(200,200,200)';
      ctx.fillRect(bX, bY, unitSize, unitSize);

      ctx.fillStyle = 'rgb(220,220,220)';
      ctx.fillRect(bX + 2, bY + 2, unitSize - 4, unitSize - 4);

      ctx.fillStyle = 'rgb(180,180,180)';
      ctx.fillRect(bX + 4, bY + 4, unitSize - 8, unitSize - 8);
    }

    if (this.loseBlock <= boardHeight + 1) {
      this.loseBlock++;

      const self = this;
      requestAnimationFrame(() => {
        self.loseScreen();
      });
    } else {
      this.init();
    }
  }

  // adds the piece as part of the board
  fillBoard(curPiece: { data: number[][] | null; colors: string[]; x: number; y: number }) {
    if (!curPiece.data) return;
    const piece = curPiece.data;
    const posX = curPiece.x;
    const posY = curPiece.y;
    const board = this.board;

    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (piece[x][y] === 1) {
          board[x + posX][y + posY].data = 1;
          board[x + posX][y + posY].colors = curPiece.colors;
        }
      }
    }

    this.checkLines();
    this.renderBoard();
  }

  // rotate a piece
  rotateTetrimono(curPiece: { data: number[][] | null; x: number; y: number }) {
    if (!curPiece.data) return null;
    const rotated: number[][] = [];

    for (let x = 0; x < 4; x++) {
      rotated[x] = [];
      for (let y = 0; y < 4; y++) {
        rotated[x][y] = curPiece.data[3 - y][x];
      }
    }

    if (
      !this.checkMovement(
        {
          data: rotated,
          x: curPiece.x,
          y: curPiece.y,
        },
        0,
        0
      )
    ) {
      return curPiece.data;
    }

    return rotated;
  }

  // assign the player a new peice
  newTetromino() {
    const pieceNum = Math.floor(Math.random() * tetrominos.length);
    const curPiece = this.curPiece;

    curPiece.data = tetrominos[pieceNum].data;
    curPiece.colors = tetrominos[pieceNum].colors;
    curPiece.x = Math.floor(Math.random() * (this.boardWidth - curPiece.data.length + 1));
    curPiece.y = -4;
  }
}

export function HeroAnimation({ showGUI = false }: { showGUI?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tetrisInstancesRef = useRef<Tetris[]>([]);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    // Find the parent section element
    sectionRef.current = container.closest('section');
    
    const initAnimation = () => {
      if (!sectionRef.current) return [];

      // Get section dimensions
      const sectionRect = sectionRef.current.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const sectionWidth = sectionRect.width;
      const sectionHeight = sectionRect.height;
      
      // Start from 50% of section (where text ends) and go to the right edge
      const startX = sectionWidth * 0.5;
      const animationWidth = sectionWidth * 0.5;
      
      const boardDiv = 20 * Math.round(animationWidth / 20);
      const boards = 8;
      const bWidth = boardDiv / boards;
      const tetrisInstances: Tetris[] = [];

      for (let w = 0; w < boards; w++) {
        // Calculate position relative to container
        const x = startX - containerRect.left + 20 * Math.round((w * bWidth) / 20);
        const y = sectionRect.top - containerRect.top;
        tetrisInstances.push(new Tetris(x, y, bWidth, sectionHeight, container));
      }

      return tetrisInstances;
    };

    let tetrisInstances = initAnimation();
    tetrisInstancesRef.current = tetrisInstances;

    const handleResize = () => {
      // Stop all animations first
      tetrisInstances.forEach((instance) => {
        instance.stop();
        if (instance.bgCanvas.parentNode) {
          instance.bgCanvas.parentNode.removeChild(instance.bgCanvas);
        }
        if (instance.fgCanvas.parentNode) {
          instance.fgCanvas.parentNode.removeChild(instance.fgCanvas);
        }
      });

      // Create new instances
      tetrisInstances = initAnimation();
      tetrisInstancesRef.current = tetrisInstances;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Stop all animations before cleanup
      tetrisInstancesRef.current.forEach((instance) => {
        instance.stop();
        if (instance.bgCanvas.parentNode) {
          instance.bgCanvas.parentNode.removeChild(instance.bgCanvas);
        }
        if (instance.fgCanvas.parentNode) {
          instance.fgCanvas.parentNode.removeChild(instance.fgCanvas);
        }
      });
      tetrisInstancesRef.current = [];
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
