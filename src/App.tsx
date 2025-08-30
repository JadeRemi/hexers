import React from 'react'
import Canvas from './components/Canvas'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

const App: React.FC = () => {
  return (
    <div className="app">
      <ErrorBoundary>
        <Canvas />
      </ErrorBoundary>
    </div>
  )
}

export default App