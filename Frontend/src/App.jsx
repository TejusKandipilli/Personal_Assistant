import {AudioRecorder} from "./components/AudioRecorder";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OAuthSuccess from './OAuthSuccess';


function App() {  

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AudioRecorder />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
      </Routes>
    </Router>
  )
}

export default App
