import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SearchPage from './SearchPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<SearchPage />} />
      </Routes>
    </BrowserRouter>
  );
}
