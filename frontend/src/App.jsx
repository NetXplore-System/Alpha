import { useState } from 'react'
import './App.css'
import UploadWhatsAppFile from './components/Form.jsx';


function App() {
  const [count, setCount] = useState(0)

  return (
    <>

           <div className="upload-section">
        <UploadWhatsAppFile />
      </div>
    </>
  )
}

export default App
