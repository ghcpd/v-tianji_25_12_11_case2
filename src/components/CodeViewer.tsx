import { useState } from 'react'
import { ReviewFile } from '../types'
import './CodeViewer.css'

interface CodeViewerProps {
  file: ReviewFile
  onLineClick?: (lineNumber: number) => void
  selectedLines?: number[]
}

const CodeViewer: React.FC<CodeViewerProps> = ({
  file,
  onLineClick,
  selectedLines = [],
}) => {
  const [expanded, setExpanded] = useState(true)
  const lines = file.content.split('\n')

  return (
    <div className="code-viewer">
      <div className="code-viewer-header" onClick={() => setExpanded(!expanded)}>
        <span className="file-path">{file.path}</span>
        <span className="file-language">{file.language}</span>
        <span className="expand-icon">{expanded ? '−' : '+'}</span>
      </div>
      {expanded && (
        <div className="code-content">
          <div className="line-numbers">
            {lines.map((_, index) => (
              <div
                key={index}
                className={`line-number ${selectedLines.includes(index + 1) ? 'selected' : ''} ${onLineClick ? 'clickable' : ''}`}
                onClick={() => onLineClick?.(index + 1)}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <pre className="code-block">
            <code>
              {lines.map((line, index) => (
                <div
                  key={index}
                  className={`code-line ${selectedLines.includes(index + 1) ? 'selected' : ''}`}
                >
                  {line || '\u00A0'}
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}
    </div>
  )
}

export default CodeViewer

