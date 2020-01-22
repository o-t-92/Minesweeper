'use strict';

const CELL_SIZE = 32;

const Level = {
    EASY: { COLS:  9, ROWS:  9, BOMBS: 10 },
    NORM: { COLS: 16, ROWS: 16, BOMBS: 40 },
    HARD: { COLS: 30, ROWS: 16, BOMBS: 99 }
};

const Cell = {
    ZERO:    {ord: 0, name: "ZERO"},
    NUM1:    {ord: 1, name: "NUM1"},
    NUM2:    {ord: 2, name: "NUM2"},
    NUM3:    {ord: 3, name: "NUM3"},
    NUM4:    {ord: 4, name: "NUM4"},
    NUM5:    {ord: 5, name: "NUM5"},
    NUM6:    {ord: 6, name: "NUM6"},
    NUM7:    {ord: 7, name: "NUM7"},
    NUM8:    {ord: 8, name: "NUM8"},
    BOMB:    {ord: 9, name: "BOMB"},
    OPENED:  {ord: 10, name: "OPENED" },
    CLOSED:  {ord: 11, name: "CLOSED" },
    FLAGGED: {ord: 12, name: "FLAGGED"},
    BOMBED:  {ord: 13, name: "BOMBED" },
    NOBOMB:  {ord: 14, name: "NOBOMB" }
};

const GameState = { STOPPED:  0, LAUNCHED: 1, FAILURE:  2, VICTORY:  3 };

let game, fieldSize, timerId, time;

class GameUI
{
    constructor()
    {
        this.canvas = $('canvas', 'display = block; margin = auto');
        this.canvas.onmouseup = (e) =>
        {
            if (e.button === 0)
            {
                if (game.state === GameState.STOPPED)
                    game.startNewGame();
                game.pressLeftButton(new Coords(
                    Math.floor(e.offsetX / CELL_SIZE),
                    Math.floor(e.offsetY / CELL_SIZE)));
            }
            if (e.button === 1)
                game.startNewGame();
            this.repaint();
            if (game.state === GameState.VICTORY)
            {
                clearInterval(timerId);
                document.querySelector('#info').innerText = `Вы выиграли! Ваше время: ${time} сек.`;
            }
            if (game.state === GameState.FAILURE)
            {
                clearInterval(timerId);
                document.querySelector('#info').innerText = `Вы проиграли! Ваше время: ${time} сек.`;
            }
        };
        this.canvas.oncontextmenu = (e) =>
        {
            game.pressRightButton(new Coords(
                Math.floor(e.offsetX / CELL_SIZE),
                Math.floor(e.offsetY / CELL_SIZE)));
            this.repaint();
            return false;
        };

        let divLevel = $('div', 'margin=auto; width=fit-content');
        $('input', '', 'type=radio; name=level; value=easy; checked=checked', divLevel)
            .onchange = () => this.switchLevel(Level.EASY);
        $('label', '', 'innerHTML = Новичок', divLevel);
        $('input', '', 'type=radio; name=level; value=norm', divLevel)
            .onchange = () => this.switchLevel(Level.NORM);
        $('label', '', 'innerHTML = Любитель', divLevel);
        $('input', '', 'type=radio; name=level; value=hard', divLevel)
            .onchange = () => this.switchLevel(Level.HARD);
        $('label', '', 'innerHTML = Эксперт', divLevel);

        $('div', 'margin=auto; width=fit-content', 'id=info').innerText = 'Время: 0';

        GameUI.loadImages();
        Cell.CLOSED.img.onload = () => this.switchLevel(Level.EASY);
    }
    
    repaint()
    {
        let context2d = this.canvas.getContext('2d');
        for (let x = 0; x < fieldSize.x; x++)
            for (let y = 0; y < fieldSize.y; y++)
                context2d.drawImage(game.getCell(new Coords(x, y)).img,
                    x * CELL_SIZE, y * CELL_SIZE);
    }
    
    static loadImages()
    {
        for (let c in Cell)
        {
            Cell[c].img = new Image();
            Cell[c].img.src = `../Images/${c}.png`;
        }
    }
    
    switchLevel(level)
    {
        clearInterval(timerId);
        time = 0;
        game = new Game(level.COLS, level.ROWS, level.BOMBS);
        this.canvas.width = level.COLS * CELL_SIZE;
        this.canvas.height = level.ROWS * CELL_SIZE;
        this.repaint();
    }
}

class Coords
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }

    equals(coord)
    {
        return coord instanceof Coords &&
            coord.x === this.x &&
            coord.y === this.y;
    }
}

function inRange(coords)
{
    return coords.x >= 0 && coords.x < fieldSize.x &&
           coords.y >= 0 && coords.y < fieldSize.y;
}

function getCoordsAround(pos)
{
    let res = [];
    let neighbor;
    for (let x = pos.x - 1; x <= pos.x + 1; x++)
        for (let y = pos.y - 1; y <= pos.y + 1; y++)
        {
            neighbor = new Coords(x, y);
            if (inRange(neighbor) && !pos.equals(neighbor))
                res.push(neighbor);
        }
    return res;
}

class Matrix
{
    constructor(fillingCell)
    {
        this.map = new Array(fieldSize.x);
        for (let i = 0; i < fieldSize.x; i++)
            this.map[i] = new Array(fieldSize.y);
        this.fill(fillingCell);
    }
    
    get(coords)
    {
        if (inRange(coords))
            return this.map[coords.x][coords.y];
        else
            return null;
    }
    
    set(coords, cell)
    {
        if (inRange(coords))
            this.map[coords.x][coords.y] = cell;
    }
    
    fill(fillingCell)
    {
        for (let x = 0; x < fieldSize.x; x++)
            for (let y = 0; y < fieldSize.y; y++)
                this.map[x][y] = fillingCell;
    }
}

class BombMap extends Matrix
{
    constructor(totalBombs)
    {
        super(Cell.ZERO);
        let maxBombs = Math.floor(fieldSize.x * fieldSize.y / 5);
        this.totalBombs = totalBombs > maxBombs ? maxBombs : totalBombs;
    }
    
    reset()
    {
        this.fill(Cell.ZERO);
        for (let i = 0; i < this.totalBombs; i++)
        {
            let pos;
            do { pos = new Coords(randInt(fieldSize.x), randInt(fieldSize.y)); }
            while (this.get(pos) === Cell.BOMB);
            this.set(pos, Cell.BOMB);
            let coordsAround = getCoordsAround(pos);
            for (let j = 0; j < coordsAround.length; j++)
                this.set(coordsAround[j], BombMap.getNextNumCell(this.get(coordsAround[j])));
        }
    }
    
    static getNextNumCell(cell)
    {
        if (cell.ord < Cell.NUM8.ord)
            return Cell[`NUM${cell.ord + 1}`];
        else
            return cell;
    }
}

class Flagmap extends Matrix
{
    constructor()
    {
        super(Cell.CLOSED);
        this.reset();
    }
    reset()
    {
        this.fill(Cell.CLOSED);
        this.totalFlags = 0;
        this.totalClosed = fieldSize.x * fieldSize.y;
    }
    setCellOpened(pos)
    {
        this.set(pos, Cell.OPENED);
        this.totalClosed--;
    }
    setCellClosed(pos)
    {
        this.set(pos, Cell.CLOSED);
        this.totalFlags--;
    }
    setCellFlagged(pos)
    {
        this.set(pos, Cell.FLAGGED);
        this.totalFlags++;
    }
    setCellBombed(pos)
    {
        this.set(pos, Cell.BOMBED);
    }
    setCellNobomb(pos)
    {
        this.set(pos, Cell.NOBOMB);
    }
    toggleFlagInCell(pos)
    {
        switch (this.get(pos))
        {
            case Cell.CLOSED:
                this.setCellFlagged(pos); break;
            case Cell.FLAGGED:
                this.setCellClosed(pos); break;
        }
    }
    flagLastClosedCells()
    {
        for (let x = 0; x < fieldSize.x; x++)
            for (let y = 0; y < fieldSize.y; y++)
                if (this.map[x][y] === Cell.CLOSED)
                    this.setCellFlagged(new Coords(x, y));
    }
    countFlagsAround(pos)
    {
        let count = 0;
        let around = getCoordsAround(pos);
        for (let i = 0; i < around.length; i++)
            if (this.get(around[i]) === Cell.FLAGGED)
                count++;
        return count;
    }
}

class Game
{
    constructor(cols, rows, bombs)
    {
        fieldSize = new Coords(cols, rows);
        this.bombMap = new BombMap(bombs);
        this.flagMap = new Flagmap();
        this.state = GameState.STOPPED;
    }
    
    startNewGame()
    {
        this.bombMap.reset();
        this.flagMap.reset();
        this.state = GameState.LAUNCHED;
        clearInterval(timerId);
        time = 0;
        timerId = setInterval(() => {
            document.querySelector('#info').innerText = `Время: ${++time}`;
        }, 1000);
    }

    getCell(pos)
    {
        let cell = this.flagMap.get(pos);
        return cell === Cell.OPENED ? this.bombMap.get(pos) : cell;
    }

    pressLeftButton(pos)
    {
        if (this.state === GameState.LAUNCHED)
        {
            this.openCell(pos);
            if (this.flagMap.totalClosed === this.bombMap.totalBombs)
            {
                this.state = GameState.VICTORY;
                this.flagMap.flagLastClosedCells();
            }
        }
    }

    pressRightButton(pos)
    {
        if (this.state === GameState.LAUNCHED)
            this.flagMap.toggleFlagInCell(pos);
    }

    openCell(pos)
    {
        switch (this.flagMap.get(pos))
        {
            case Cell.OPENED:
                if (this.bombMap.get(pos).ord === this.flagMap.countFlagsAround(pos))
                {
                    let around = getCoordsAround(pos);
                    for (let i = 0; i < around.length; i++)
                        if (this.flagMap.get(around[i]) === Cell.CLOSED)
                            this.openCell(around[i]);
                }
                break;
            case Cell.FLAGGED:
                break;
            case Cell.CLOSED:
                this.flagMap.setCellOpened(pos);
                switch (this.bombMap.get(pos))
                {
                    case Cell.ZERO:
                        let around = getCoordsAround(pos);
                        for (let i = 0; i < around.length; i++)
                            this.openCell(around[i]);
                        break;
                    case Cell.BOMB:
                        this.flagMap.setCellBombed(pos);
                        for (let x = 0; x < fieldSize.x; x++)
                            for (let y = 0; y < fieldSize.y; y++)
                            {
                                if (this.bombMap.map[x][y] === Cell.BOMB)
                                {
                                    if (this.flagMap.map[x][y] === Cell.CLOSED)
                                        this.flagMap.map[x][y] = Cell.OPENED;
                                }
                                else
                                    if (this.flagMap.map[x][y] === Cell.FLAGGED)
                                        this.flagMap.map[x][y] = Cell.NOBOMB;
                            }
                        this.state = GameState.FAILURE;
                }
        }
    }
}

function randInt(max)   // [0;max)
{
    return Math.floor(Math.random() * max);
}
