import '@vkontakte/vkui/dist/vkui.css'

import 'core-js/features/map'
import 'core-js/features/set'

import React, {
    useState,
    useEffect,
    useCallback,
} from 'react'

import ReactDOM from 'react-dom'

import {
    ConfigProvider,
    View,
    Alert,
    Headline,
    Text,
} from '@vkontakte/vkui/'

import Loading from './panels/Loading'
import Slideshow from './panels/Slideshow'
import Home from './panels/Home'
import Friends from './panels/Friends'
import Profile from './panels/Profile'

import {
    currentPlatform,
} from './panels/_platformSwitch.js'

import {
    vkUsersGet,
} from './sociorate-api'

import bridge from '@vkontakte/vk-bridge'


function App() {
    const [isVKWebAppInitDone, setIsVKWebAppInitDone] = useState(false)

    const [appScheme, setAppScheme] = useState('bright_light')
    const [appViewHistory, setAppViewHistory] = useState(['home'])

    const [autoTheme, setAutoTheme] = useState('light')
    const [themeOption, setThemeOption] = useState(null)

    const [isSlideshowDone, setIsSlideshowDone] = useState(null)

    const [activePanel, setActivePanel] = useState('loading')
    const [popout, setPopout] = useState(null)

    const [currentUser, setCurrentUser] = useState(null)
    const [panelProfileUser, setPanelProfileUser] = useState(null)

    useEffect(() => {
        window.onpopstate = (event) => {
            if (event.state != null) {
                // TODO: роутинг
                // if (event.state.panelProfileUser) {
                //     setPanelProfileUser(event.state.panelProfileUser)
                // }
                // if (event.state.panelid) {
                //     setActivePanel(event.state.panelid)
                // }
            } else {
                setAppViewHistory(['home'])
                setActivePanel('home')
            }
        }

        const handler = ({ detail: { type, data } }) => {
            switch (type) {
                case 'VKWebAppUpdateConfig':
                    setAutoTheme(data.scheme === 'space_gray' || data.scheme === 'client_dark' ? 'dark' : 'light')
                    break
            }
        }

        const vkWebAppInit = async () => {
            try {
                bridge.subscribe(handler)
                await bridge.send('VKWebAppInit')
                setIsVKWebAppInitDone(true)
            } catch (err) {
                console.error(err)
                bridge.unsubscribe(handler)
                setPopout(
                    <Alert
                        onClose={() => {
                            setPopout(null)
                            vkWebAppInit()
                        }}
                        actions={[{
                            title: 'Повторить попытку',
                            autoclose: true,
                        }]}
                    >
                        <Headline>Произошла ошибка</Headline>
                        <Text>Примите извинения, приложению не удалось загрузиться</Text>
                    </Alert>
                )
            }
        }
        vkWebAppInit()

        return () => { bridge.unsubscribe(handler) }
    }, [])

    useEffect(() => {
        const changeTheme = (themeName) => {
            switch (themeName) {
                case 'dark':
                    setAppScheme('space_gray')
                    break
                default:
                    setAppScheme('bright_light')
            }
        }

        if (themeOption === 'auto') {
            changeTheme(autoTheme)
            return
        }

        changeTheme(themeOption)
    }, [autoTheme, themeOption])

    const changeThemeOption = useCallback(async (newThemeOption) => {
        setThemeOption(newThemeOption)

        try {
            await bridge.send('VKWebAppStorageSet', { key: 'theme_option', value: String(newThemeOption) })
        } catch (err) {
            console.error(err)
        }
    }, [])

    useEffect(() => {
        if (!isVKWebAppInitDone) {
            return
        }

        const fetchThingsFromStorage = async () => {
            let themeOptionData = null
            let isSlideshowDoneData = null

            try {
                let data = (await bridge.send('VKWebAppStorageGet', { keys: ['theme_option', 'is_slideshow_done'] })).keys

                for (let i = 0; i < data.length; i++) {
                    switch (data[i].key) {
                        case 'theme_option':
                            themeOptionData = data[i].value
                            break
                        case 'is_slideshow_done':
                            isSlideshowDoneData = data[i].value
                            break
                    }
                }
            } catch (err) {
                console.error(err)
            }

            if (themeOptionData == null) {
                setThemeOption('auto')
            } else {
                setThemeOption(String(themeOptionData))
            }
            if (isSlideshowDoneData == null) {
                setIsSlideshowDone(false)
            } else {
                setIsSlideshowDone(Boolean(isSlideshowDoneData))
            }
        }
        fetchThingsFromStorage()
    }, [isVKWebAppInitDone])

    useEffect(() => {
        if (!isSlideshowDone) {
            return
        }

        const fetchCurrentUser = async () => {
            try {
                let userid = (new URLSearchParams(window.location.search)).get('vk_user_id')

                let user = (await vkUsersGet(userid))[0]
                if (!user) {
                    return
                }

                setCurrentUser(user)
            } catch (err) {
                console.error(err)
                setPopout(
                    <Alert
                        onClose={() => {
                            setPopout(null)
                            fetchCurrentUser()
                        }}
                        actions={[{
                            title: 'Повторить попытку',
                            autoclose: true,
                        }]}
                    >
                        <Headline>Произошла ошибка</Headline>
                        <Text>Примите извинения, приложению не удалось загрузиться</Text>
                    </Alert>
                )
            }
        }
        fetchCurrentUser()

        const fetchUserInLocationHash = async () => {
            try {
                let userid = ''

                let location = window.location.hash.substring(window.location.hash.indexOf('#') + 1)
                let index = location.indexOf('@')
                if (index !== -1) {
                    userid = location.substring(index + 1)
                }

                if (userid === '') {
                    setActivePanel('home')
                    return
                }

                let user = (await vkUsersGet(userid))[0]
                if (!user) {
                    throw new Error('`user` is empty')
                }

                setPanelProfileUser(user)
                setActivePanel('profile')
            } catch (err) {
                setActivePanel('home')
                console.error(err)
            }
        }
        fetchUserInLocationHash()
    }, [isSlideshowDone])

    const slideshowDoneCallback = useCallback(async () => {
        setActivePanel('home')
        setIsSlideshowDone(true)

        try {
            await bridge.send('VKWebAppStorageSet', { key: 'is_slideshow_done', value: String(true) })
        } catch (err) {
            console.error(err)
        }
    }, [])

    return (
        <ConfigProvider
            isWebView={true}
            scheme={appScheme}
        >
            <View
                activePanel={themeOption != null && isSlideshowDone != null ? (isSlideshowDone ? activePanel : 'slideshow') : 'loading'}
                popout={popout}
                history={appViewHistory}
                onSwipeBack={currentPlatform != 'desktop_web' ? () => { window.history.back() } : () => { setActivePanel('home') }}
            >
                <Loading id='loading' />

                <Slideshow id='slideshow' doneCallback={slideshowDoneCallback} />

                <Home id='home' setActivePanel={setActivePanel} setPanelProfileUser={setPanelProfileUser} setPopout={setPopout} changeThemeOption={changeThemeOption} currentUser={currentUser} />
                <Friends id='friends' setActivePanel={setActivePanel} setPanelProfileUser={setPanelProfileUser} />
                <Profile id='profile' setActivePanel={setActivePanel} setAppViewHistory={setAppViewHistory} setPopout={setPopout} currentUser={currentUser} user={panelProfileUser} />
            </View>
        </ConfigProvider>
    )
}

if (process.env.NODE_ENV === 'development') {
    import('./eruda') //runtime download
}

ReactDOM.render(<React.StrictMode><App /></React.StrictMode>, document.getElementById('root'))
