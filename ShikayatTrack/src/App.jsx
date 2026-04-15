import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ComplaintProvider } from './context/ComplaintContext.jsx'
import RootLayout from './layouts/RootLayout.jsx'
import Admin from './pages/Admin.jsx'
import Home from './pages/Home.jsx'
import MapPage from './pages/MapPage.jsx'
import Report from './pages/Report.jsx'
import Track from './pages/Track.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'report', element: <Report /> },
      { path: 'track', element: <Track /> },
      { path: 'map', element: <MapPage /> },
      { path: 'admin', element: <Admin /> },
    ],
  },
])

function App() {
  return (
    <ComplaintProvider>
      <RouterProvider router={router} />
    </ComplaintProvider>
  )
}

export default App
