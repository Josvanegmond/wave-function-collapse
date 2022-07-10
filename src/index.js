import Phaser from 'phaser';
import tilesImg from './assets/tiles.png';

const GAME_SCALE = 4
const TILE_SIZE = 14
const HALF_TILE_SIZE = TILE_SIZE / 2
const ALL_TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
let TILES = [].concat(ALL_TILES)

const TILE_BORDERS = [
  [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
  [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 1, 1], [1, 2, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 1, 1], [1, 3, 1], [1, 1, 1], [1, 3, 1]],
  [[4, 1, 1], [1, 2, 1], [1, 1, 4], [0, 0, 0]],
  [[4, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 4]],
  [[1, 1, 1], [1, 2, 1], [1, 1, 1], [1, 2, 1]],
  [[1, 3, 1], [1, 2, 1], [1, 3, 1], [1, 2, 1]],
  [[1, 3, 1], [1, 1, 1], [1, 2, 1], [1, 1, 1]],
  [[1, 2, 1], [1, 2, 1], [1, 1, 1], [1, 2, 1]],
  [[1, 2, 1], [1, 2, 1], [1, 2, 1], [1, 2, 1]],
  [[1, 2, 1], [1, 2, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 1, 1], [1, 2, 1], [1, 1, 1], [1, 2, 1]],
  [[1, 3, 1], [1, 2, 1], [1, 1, 1], [1, 1, 1]],
]

const TILE_BORDER_DIRECTIONS = [
  { direction: 'north', dx: 0, dy: -1, borderIndex: 0 },
  { direction: 'east', dx: 1, dy: 0, borderIndex: 1 },
  { direction: 'south', dx: 0, dy: 1, borderIndex: 2 },
  { direction: 'west', dx: -1, dy: 0, borderIndex: 3 },
]

const cropImage = function (image, size, rotation, index) {
  const halfSize = size / 2
  image.setOrigin(0, 0)
  image.setSize(size, size)
  image.setCrop(0, size * index, size, size)

  switch (rotation) {
    case 0:
      image.setPosition(-halfSize, -index * size - halfSize)
      break
    case 1:
      image.setAngle(90)
      image.setPosition((index + 1) * size - halfSize, -halfSize)
      break
    case 2:
      image.setAngle(180)
      image.setPosition(halfSize, (index + 1) * size - halfSize)
      break
    case 3: 
      image.setAngle(270)
      image.setPosition(-index * size - halfSize, halfSize)
      break
  }
}

class TileState {
  removed = false

  constructor(index, rotation, image) {
    this.index = index
    this.rotation = rotation
    this.image = image

    cropImage(image, TILE_SIZE, this.rotation, this.index)

    this.borderValues = [].concat(TILE_BORDERS[this.index])
    for (let i = 0; i < this.rotation; i++) {
      this.borderValues.unshift(this.borderValues.pop())
    }
  }

  setRemoved() {
    this.removed = true
  }

  getBorderValue(tileBorderDirection) {
    return [].concat(this.borderValues[tileBorderDirection.borderIndex])
  }
}

class Tile extends Phaser.GameObjects.Container {
  px = 0
  py = 0
  random = Math.random() * 2 - 1

  constructor(scene, id, grid) {
    super(scene, 0, 0)
    
    this.id = id
    this.grid = grid

    this.tileStates = []
    for (let j = 0; j < TILE_BORDER_DIRECTIONS.length; j++) {
      for (let i = 0; i < TILES.length; i++) {
        const image = new Phaser.GameObjects.Sprite(this.scene, 0, 0, 'tiles')
        this.add(image)
        this.tileStates.push(new TileState(TILES[i], j, image))
      }
    }
    this.entropy = 1 / this.tileStates.length

    this.setSize(TILE_SIZE, TILE_SIZE)
    this.setInteractive()
    
    this.reset()
  }

  reset() {
    this.random = Math.random() * 2 - 1
    this.tileStates.forEach(ts => {
      ts.removed = !TILES.includes(ts.index)
    })
    this.entropy = 1 / this.getValidTileStates().length
    this.updateTileStates()
  }

  getValidTileStates() {
    return this.tileStates.filter(ts => !ts.removed)
  }

  onClick(p) {
    if (this.entropy !== 1) {
      this.grid.startCollapse(this)
    }
  }

  collapseNeighbourTileStates() {
    this.collapseNeighbourTileState(TILE_BORDER_DIRECTIONS[0], TILE_BORDER_DIRECTIONS[2])
    this.collapseNeighbourTileState(TILE_BORDER_DIRECTIONS[1], TILE_BORDER_DIRECTIONS[3])
    this.collapseNeighbourTileState(TILE_BORDER_DIRECTIONS[2], TILE_BORDER_DIRECTIONS[0])
    this.collapseNeighbourTileState(TILE_BORDER_DIRECTIONS[3], TILE_BORDER_DIRECTIONS[1])
  }

  collapseNeighbourTileState(sourceBorderDirection, targetBorderDirection) {
    const sourceBorders = this.getValidTileStates().map(ts => ts.getBorderValue(sourceBorderDirection).join(','))

    const targetTile = this.grid.getTile(this.px + sourceBorderDirection.dx, this.py + sourceBorderDirection.dy)
    if (targetTile) {
      targetTile
        .getValidTileStates()
        .forEach(ts => {
          const targetBorder = ts.getBorderValue(targetBorderDirection).reverse().join(',')
          ts.removed = !sourceBorders.includes(targetBorder)
        })
      
      // Nothing changed
      if (targetTile.getValidTileStates().length === targetTile.entropy) {
        return
      }

      targetTile.updateTileStates()
      targetTile.collapseNeighbourTileStates()
    }
  }

  collapseTileStates(collapseIndex, collapseRotation) {
    this.tileStates
      .filter(ts => !(ts.index === collapseIndex && ts.rotation === collapseRotation))
      .forEach(ts => ts.removed = true)
    
    this.updateTileStates()
    this.collapseNeighbourTileStates()
  }

  updateTileStates() {
    this.entropy = this.getValidTileStates().length
    this.tileStates.forEach(tileState => {
      tileState.image.setVisible(!tileState.removed)

      const alpha = 1 / this.entropy
      tileState.image.setAlpha(alpha)
    })
  }

  setPos(px, py) {
    this.px = px
    this.py = py
    this.setPosition(this.px * TILE_SIZE + HALF_TILE_SIZE, this.py * TILE_SIZE + HALF_TILE_SIZE)
    this.updateTileStates()
  }

  update(time) {
    if (this.entropy !== 1) {
      const alpha = 0.5 / this.entropy
      this.tileStates.forEach(ts => {
        const offset = alpha +
          Math.cos(
            0.01 * (
              (this.rotation + 1) * 4 * (ts.index + 1) * 97.13 -
              this.px * Math.PI +
              113.13 * this.py +
              Math.sin(Math.PI * this.random) * time
            )
          ) * 0.05
        
        ts.image.setAlpha(offset)
      })
    }
  }
}

class Grid extends Phaser.GameObjects.Container {
  isRunning = false
  isDone = false

  constructor(scene, x, y, width, height) {
    super(scene, x, y)
    this.scene = scene
    this.width = width
    this.height = height

    this.cells = new Array(this.width)
    
    for (let iX = 0; iX < this.width; iX++) {
      this.cells[iX] = new Array(this.height)

      for (let iY = 0; iY < this.height; iY++) {
        const tile = new Tile(scene, iX + iY * this.width, this)
        this.cells[iX][iY] = tile
        tile.setPos(iX, iY)
        this.add(tile)
      }
    }
  }

  reset() {
    this.isRunning = false
    this.isDone = false
    this.getTiles().forEach(tile => tile.reset())
  }

  getTile(x, y) {
    if(x < 0 || x >= this.width || y < 0 || y >= this.height) { return null }
    return this.cells[x][y]
  }

  getTiles() {
    return this.cells.flat(1)
  }
  
  startCollapse(tile) {
    this.isRunning = true
    this.nextTileToCollapse = null
    const tiles = this.getTiles()

    // Fully collapse tile
    const randomState = tile.getValidTileStates()[Math.floor(Math.random() * tile.getValidTileStates().length)]
    const collapseIndex = randomState.index
    const collapseRotation = randomState.rotation
    tile.collapseTileStates(collapseIndex, collapseRotation)

    // Find lowest entropy tiles higher than 1
    let lowestEntropyTiles = [].concat(tiles)
    lowestEntropyTiles.sort((t1, t2) => t1.entropy - t2.entropy)
    lowestEntropyTiles = lowestEntropyTiles.filter(t => t.entropy > 1)
    lowestEntropyTiles = lowestEntropyTiles.filter(t => t.entropy === lowestEntropyTiles[0].entropy)
    
    // Pick random tile and start collapse
    if (lowestEntropyTiles.length > 0) {
      this.nextTileToCollapse = lowestEntropyTiles[Math.floor(Math.random() * lowestEntropyTiles.length)]
    }
  }

  update(time) {
    this.getTiles().forEach(tile => {
      tile.update(time)
    })

    if (this.nextTileToCollapse) {
      this.startCollapse(this.nextTileToCollapse)
    } else if (this.isRunning) {
      this.isDone = true
      this.isRunning = false
    }
  }
}


class GameScene extends Phaser.Scene {
  interval = 10
  timer = 0

  constructor() {
    super()
  }

  preload() {
    this.scale.setZoom(GAME_SCALE)
    this.load.image('tiles', tilesImg)
  }
  
  create() {
    this.grid = new Grid(this, TILE_SIZE + 4, 2, 27, 16)
    this.add.existing(this.grid)

    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (this.grid.isRunning) {
        return
      } else if (this.grid.isDone) {
        this.grid.reset()
      } else {
        gameObject.onClick(pointer)
      }
    })

    for (let i = 0; i < ALL_TILES.length; i++) {
      const image = new Phaser.GameObjects.Sprite(this, 0, 0, 'tiles')
      cropImage(image, TILE_SIZE, 0, i)

      const button = new Phaser.GameObjects.Container(this, 2 + HALF_TILE_SIZE, TILE_SIZE * i + HALF_TILE_SIZE + (i + 1) * 2, [image])
      button.setSize(TILE_SIZE, TILE_SIZE)
      button.setInteractive()
      button.onClick = (p) => {
        console.log('click', i)
        if (TILES.includes(i)) {
          TILES.splice(TILES.indexOf(i), 1)
          image.setAlpha(0.3)
        } else {
          TILES.push(i)
          image.setAlpha(1)
        }
        this.grid.reset()
      }

      this.add.existing(button)
    }
  }

  update(time, delta) {
    this.timer += delta
    
    if (this.timer > this.interval) {
      this.timer -= this.interval
      this.grid.update(time)
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 400,
  height: 240,
  scene: GameScene,
  render: {
    pixelArt: true,
    roundPixels: true,
  },
};


const game = new Phaser.Game(config);
