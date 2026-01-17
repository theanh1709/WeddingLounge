import { useEffect, useState } from 'react'

function getHashRoute() {
  if (typeof window === 'undefined') {
    return { path: 'home', params: new URLSearchParams() }
  }
  const rawHash = window.location.hash.replace('#', '')
  if (rawHash) {
    const [path, query = ''] = rawHash.split('?')
    return {
      path: path || 'home',
      params: new URLSearchParams(query),
    }
  }
  const pathname = window.location.pathname.replace(/^\/+/, '')
  const search = window.location.search.replace(/^\?/, '')
  return {
    path: pathname || 'home',
    params: new URLSearchParams(search),
  }
}

export default function useHashRoute() {
  const [route, setRoute] = useState(getHashRoute)

  useEffect(() => {
    const onChange = () => setRoute(getHashRoute())
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  return route
}
