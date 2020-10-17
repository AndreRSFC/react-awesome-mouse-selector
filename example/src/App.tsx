import React, { useState } from 'react'

import Selection from 'react-awesome-mouse-selector'

import './index.css'

const App = () => {
  const [elRefs, setElRefs] = useState<HTMLDivElement[]>([])
  const [currentRef, setCurrentRef] = useState<HTMLDivElement>()

  const addElementRef = (ref: any) => {
    if (!elRefs.includes(ref)) {
      const elRefsLet = elRefs
      elRefsLet.push(ref)
      setElRefs(elRefsLet)
    }
  }

  const renderSelection = () => {
    if (!currentRef || !elRefs) {
      return null
    }

    return (
      <Selection
        target={currentRef}
        elements={elRefs}
        onSelectionChange={(e) => console.log(e)}
        onHighlightChange={(e) => console.log(e)}
        style='block'
        dataContent={''}
        blockSelection={false}
        cellSize={{ width: 141, height: 98 }}
        selectionSize={{ maxWidth: 422, maxHeight: 293 }}
        blockedPoints={[]}
      />
    )
  }

  return (
    <div
      ref={(ref) => {
        ref && setCurrentRef(ref)
      }}
      style={{ display: 'flex', maxWidth: '423px', flexWrap: 'wrap' }}
    >
      {Array(9)
        .fill(null)
        .map((_, index) => {
          return (
            <div
              ref={addElementRef}
              style={{
                minWidth: '141px',
                minHeight: '98px',
                boxSizing: 'border-box',
                border: '1px solid  black',
                backgroundColor: 'red'
              }}
            >
              {index}
            </div>
          )
        })}
      {renderSelection()}
    </div>
  )
}

export default App
