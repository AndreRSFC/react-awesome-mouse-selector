import React from 'react'

export type Point = {
  x: number
  y: number
}

export type Box = {
  left: number
  top: number
  width: number
  height: number
}

type Props = {
  disabled?: boolean
  target: HTMLElement
  onSelectionChange?: (elements: Array<number>) => void
  onHighlightChange?: (elements: Array<number>) => void
  elements: Array<HTMLElement>
  style?: string
  blockSelection?: boolean
  cellSize: {
    width: number
    height: number
  }
  dataContent: string
  selectionSize: {
    maxWidth: number
    maxHeight: number
  }
  blockedPoints: { left: number; top: number }[]
}

type State = {
  mouseDown: boolean
  startPoint: Point | null
  endPoint: Point | null
  selectionBox: Box | null
}

const twoButton = 2

function getOffset(props: Props) {
  let offset = {
    top: 0,
    left: 0
  }

  if (props.target) {
    const boundingBox = props.target.getBoundingClientRect()

    offset.top = boundingBox.top + window.scrollY
    offset.left = boundingBox.left + window.scrollX
  }
  return offset
}

export default class Selection extends React.PureComponent<Props, State> {
  props: Props
  state: State
  selectedChildren: Array<number>
  highlightedChildren: Array<number>

  constructor(props: Props) {
    super(props)

    this.state = {
      mouseDown: false,
      startPoint: null,
      endPoint: null,
      selectionBox: null
    }

    this.selectedChildren = []
    this.highlightedChildren = []
  }

  static getDerivedStateFromProps(nextProps: Props) {
    return {
      offset: getOffset(nextProps)
    }
  }

  componentDidMount() {
    this.reset()
    this.bind()
  }

  componentDidUpdate(prevProps: Props) {
    this.reset()
    this.bind()

    if (this.state.mouseDown && this.state.selectionBox) {
      this.updateCollidingChildren(this.state.selectionBox)
    }

    if (prevProps.blockSelection !== this.props.blockSelection) {
      !this.props.blockSelection &&
        this.setState({
          mouseDown: false,
          startPoint: null,
          endPoint: null,
          selectionBox: null
        })
    }
  }

  componentWillUnmount() {
    this.reset()
    window.document.removeEventListener('mousemove', this.onMouseMove)
    window.document.removeEventListener('mouseup', this.onMouseUp)
  }

  bind = () => {
    this.props.target.addEventListener('mousedown', this.onMouseDown)
  }

  reset = () => {
    if (this.props.target) {
      this.props.target.removeEventListener('mousedown', this.onMouseDown)
    }
  }

  init = (x: number, y: number): boolean => {
    const startPoint = {
      x: x,
      y: y 
    }

    const nextState = { mouseDown: true, startPoint: startPoint }

    this.setState(nextState)
    return true
  }

  onMouseDown = (e: MouseEvent | any) => {
    if (
      this.props.disabled ||
      e.button === twoButton ||
      (e.nativeEvent && e.nativeEvent.which === twoButton)
    ) {
      return
    }

    if (this.init(e.pageX, e.pageY)) {
      window.document.addEventListener('mousemove', this.onMouseMove)
      window.document.addEventListener('mouseup', this.onMouseUp)
    }
  }

  onMouseUp = () => {
    window.document.removeEventListener('mousemove', this.onMouseMove)
    window.document.removeEventListener('mouseup', this.onMouseUp)

    !this.props.blockSelection &&
      this.setState({
        mouseDown: false,
        startPoint: null,
        endPoint: null,
        selectionBox: null
      })

    if (this.props.onSelectionChange) {
      this.props.onSelectionChange(this.selectedChildren)
    }

    if (this.props.onHighlightChange) {
      this.highlightedChildren = []
      this.props.onHighlightChange(this.highlightedChildren)
    }
    this.selectedChildren = []
  }

  onMouseMove = (e: MouseEvent) => {
    e.preventDefault()
    if (this.state.mouseDown) {
      const endPoint: Point = {
        x: e.pageX,
        y: e.pageY 
      }

      this.setState({
        endPoint,
        selectionBox:
          this.state.startPoint &&
          this.calculateSelectionBox(this.state.startPoint, endPoint)
      })
    }
  }

  lineIntersects = (lineA: number[], lineB: number[]): boolean =>
    lineA[1] >= lineB[0] && lineB[1] >= lineA[0]

  boxIntersects = (boxA: Box, boxB: Box): boolean => {
    const boxAProjection = {
      x: [boxA.left, boxA.left + boxA.width],
      y: [boxA.top, boxA.top + boxA.height]
    }

    const boxBProjection = {
      x: [boxB.left, boxB.left + boxB.width],
      y: [boxB.top, boxB.top + boxB.height]
    }

    return (
      this.lineIntersects(boxAProjection.x, boxBProjection.x) &&
      this.lineIntersects(boxAProjection.y, boxBProjection.y)
    )
  }

  updateCollidingChildren = (selectionBox: Box) => {
    this.selectedChildren = []
    if (this.props.elements) {
      this.props.elements.forEach((ref, $index) => {
        if (ref) {
          const refBox = ref.getBoundingClientRect()
          const tmpBox = {
            top: (refBox.top + window.scrollY),
            left: (refBox.left + window.scrollX),
            width: ref.clientWidth,
            height: ref.clientHeight
          }

          if (this.boxIntersects(selectionBox, tmpBox)) {
            this.selectedChildren.push($index)
          }
        }
      })
    }
    if (
      this.props.onHighlightChange &&
      JSON.stringify(this.highlightedChildren) !==
        JSON.stringify(this.selectedChildren)
    ) {
      const { onHighlightChange } = this.props
      this.highlightedChildren = [...this.selectedChildren]
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          onHighlightChange(this.highlightedChildren)
        })
      } else {
        onHighlightChange(this.highlightedChildren)
      }
    }
  }

  calculateSelectionBox = (startPoint: Point, endPoint: Point) => {
    if (!this.state.mouseDown || !startPoint || !endPoint) {
      return null
    }

    const startWidthCalc = Math.floor(startPoint.x / this.props.cellSize.width)
    const endWidthCalc = Math.floor(endPoint.x / this.props.cellSize.width)

    const startHeightCalc = Math.floor(
      startPoint.y / this.props.cellSize.height
    )
    const endHeightCalc = Math.floor(endPoint.y / this.props.cellSize.height)

    const approximateLeftWidth =
      Math.abs(
        (startWidthCalc + 1) * this.props.cellSize.width -
          endWidthCalc * this.props.cellSize.width
      ) - twoButton

    const approximateRightWidth =
      Math.abs(
        startWidthCalc * this.props.cellSize.width -
          (endWidthCalc + 1) * this.props.cellSize.width
      ) - twoButton

    const approximateTopHeight =
      Math.abs(
        (startHeightCalc + 1) * this.props.cellSize.height -
          endHeightCalc * this.props.cellSize.height
      ) - twoButton

    const approximateBottomHeight =
      Math.abs(
        startHeightCalc * this.props.cellSize.height -
          (endHeightCalc + 1) * this.props.cellSize.height
      ) - twoButton

    // This calculation is based on the cell size to better meet the table

    const left = Math.min(
      startWidthCalc * this.props.cellSize.width,
      endWidthCalc * this.props.cellSize.width
    )

    const top = Math.min(
      startHeightCalc * this.props.cellSize.height,
      endHeightCalc * this.props.cellSize.height
    )

    const maxLeft = Math.max(
      startWidthCalc * this.props.cellSize.width,
      endWidthCalc * this.props.cellSize.width
    )

    const maxTop = Math.max(
      startHeightCalc * this.props.cellSize.height,
      endHeightCalc * this.props.cellSize.height
    )

    if (
      top >= 0 &&
      left >= 0 &&
      maxTop <= this.props.selectionSize.maxHeight &&
      maxLeft <= this.props.selectionSize.maxWidth
    ) {
      const width =
        startWidthCalc * this.props.cellSize.width >
        endWidthCalc * this.props.cellSize.width
          ? approximateLeftWidth
          : approximateRightWidth

      const height =
        startHeightCalc * this.props.cellSize.height >
        endHeightCalc * this.props.cellSize.height
          ? approximateTopHeight
          : approximateBottomHeight

      const checkInterception = this.props.blockedPoints.filter(
        (item) =>
          (top === item.top && left === item.left) ||
          (top + height - this.props.cellSize.height + twoButton === item.top &&
            left + width - this.props.cellSize.width + twoButton === item.left)
      )

      if (checkInterception.length === 0) {
        return {
          left,
          top,
          width,
          height
        }
      }

      return this.state.selectionBox
    } else {
      return this.state.selectionBox
    }
  }

  render() {
    let style

    if (this.state.selectionBox) {
      style = this.state.selectionBox
    }

    if (
      !this.state.mouseDown ||
      !this.state.endPoint ||
      !this.state.startPoint
    ) {
      return null
    }

    return (
      <div
        className={`react-selector ${this.props.style}`}
        style={style}
        {...(this.state.selectionBox &&
        this.state.selectionBox.width + twoButton >=
          this.props.cellSize.width &&
        this.state.selectionBox.width + twoButton >= this.props.cellSize.width
          ? { 'data-content': this.props.dataContent }
          : {})}
      />
    )
  }
}
