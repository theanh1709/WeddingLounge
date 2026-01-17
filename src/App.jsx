import { useCallback, useEffect, useState } from 'react'
import useHashRoute from './hooks/useHashRoute'
import useLocalStorage from './hooks/useLocalStorage'
import { navItems } from './data/nav'
import { defaultDrinks } from './data/drinks'
import { fetchWishes, subscribeToWishes } from './services/wishes'
import { SUPABASE_CONFIG_ERROR } from './services/supabaseClient'
import { getDeviceKind } from './utils/device'
import Topbar from './components/Topbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Wishes from './pages/Wishes'
import WishWall from './pages/WishWall'
import WishList from './pages/WishList'
import Wheel from './pages/Wheel'
import LotoHost from './pages/LotoHost'
import LotoPlayer from './pages/LotoPlayer'
import DrinkCam from './pages/DrinkCam'
import NotFound from './pages/NotFound'
import './styles/app.css'

function App() {
  const route = useHashRoute()
  const [wishes, setWishes] = useState([])
  const [wishLoading, setWishLoading] = useState(true)
  const [wishError, setWishError] = useState('')
  const [lastGuest, setLastGuest] = useLocalStorage('wedding-last-guest', '')
  const [deviceKind, setDeviceKind] = useState(() => getDeviceKind())
  const [drinkItems, setDrinkItems] = useLocalStorage(
    'wedding-drink-items',
    defaultDrinks,
  )

  const upsertWish = useCallback((wish) => {
    if (!wish) {
      return
    }
    setWishes((prev) => {
      if (prev.some((item) => item.id === wish.id)) {
        return prev
      }
      const next = [...prev, wish]
      next.sort(
        (a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0),
      )
      return next
    })
  }, [])

  useEffect(() => {
    let active = true

    const loadWishes = async () => {
      setWishLoading(true)
      setWishError('')
      const { data, error } = await fetchWishes()
      if (!active) {
        return
      }
      if (error) {
        setWishError(
          error.code === SUPABASE_CONFIG_ERROR
            ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
            : 'Không thể tải dữ liệu lời chúc từ Supabase.',
        )
      } else {
        setWishes(data)
      }
      setWishLoading(false)
    }

    loadWishes()
    const unsubscribe = subscribeToWishes((wish) => {
      if (active) {
        upsertWish(wish)
      }
    })

    return () => {
      active = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [upsertWish])

  useEffect(() => {
    setDeviceKind(getDeviceKind())
  }, [])

  let content = null
  switch (route.path) {
    case 'home':
      content = <Home />
      break
    case 'wishes':
      content = (
        <Wishes
          wishes={wishes}
          onWishAdded={upsertWish}
          lastGuest={lastGuest}
          setLastGuest={setLastGuest}
          wishError={wishError}
          wishLoading={wishLoading}
        />
      )
      break
    case 'wall':
      content = <WishWall wishes={wishes} />
      break
    case 'wish-list':
      content = (
        <WishList
          wishes={wishes}
          wishLoading={wishLoading}
          wishError={wishError}
        />
      )
      break
    case 'wheel':
      content = <Wheel wishes={wishes} />
      break
    case 'loto-host':
      content = <LotoHost />
      break
    case 'loto-player':
      content = <LotoPlayer />
      break
    case 'drink-cam/viewer':
      content = (
        <DrinkCam
          mode="viewer"
          routeParams={route.params}
          drinkItems={drinkItems}
          setDrinkItems={setDrinkItems}
        />
      )
      break
    case 'drink-cam/camera':
      content = (
        <DrinkCam
          mode="camera"
          routeParams={route.params}
          drinkItems={drinkItems}
          setDrinkItems={setDrinkItems}
        />
      )
      break
    case 'drink':
      content = (
        <DrinkCam
          mode="viewer"
          routeParams={route.params}
          drinkItems={drinkItems}
          setDrinkItems={setDrinkItems}
        />
      )
      break
    default:
      content = <NotFound />
  }

  const mainClassName =
    route.path === 'drink-cam/viewer' || route.path === 'drink'
      ? 'main viewer-main'
      : 'main'
  const isHandheld = deviceKind === 'mobile' || deviceKind === 'tablet'
  const appClassName = isHandheld ? 'app device-handheld' : 'app'

  return (
    <div className={appClassName}>
      <Topbar
        navItems={navItems}
        activePath={route.path}
        isHandheld={isHandheld}
      />
      <main className={mainClassName}>{content}</main>
      <Footer />
    </div>
  )
}

export default App
