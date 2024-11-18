import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TextEditor from './TextEditor.tsx';
import VerificationPage from './VerificationPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<TextEditor />} />
                <Route path="/verify/:id" element={<VerificationPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
