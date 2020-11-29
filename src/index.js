import '@vkontakte/vkui/dist/vkui.css'
import './cursor-pointer.css'

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

import platformSwitch from './panels/_platformSwitch'

import {
    vkUsersGet,
} from './sociorate-api'

import bridge from '@vkontakte/vk-bridge'

function App() {
    const [isVKWebAppInitDone, setIsVKWebAppInitDone] = useState(false)

    const [appScheme, setAppScheme] = useState('bright_light')
    const [appViewHistory, setAppViewHistory] = useState(['home'])

    const [autoThemeOption, setAutoThemeOption] = useState('light')
    const [themeOption, setThemeOption] = useState(null)

    const [isSlideshowDone, setIsSlideshowDone] = useState(null)

    const [isFetchUserFromLocationDone, setIsFetchUserFromLocationDone] = useState(false)

    const [activePanel, setActivePanel] = useState(null)
    const [popout, setPopout] = useState(null)

    const [currentUser, setCurrentUser] = useState(null)
    const [panelProfileUser, setPanelProfileUser] = useState(null)

    const handleHistoryStateChange = useCallback((state) => {
        setPopout(null)

        let panelid = ""

        if (state != null) {
            if (state.panelProfileUser) {
                setPanelProfileUser(state.panelProfileUser)
            }
            if (state.panelid) {
                panelid = state.panelid
            }
        } else {
            panelid = 'home'
        }

        let index = appViewHistory.indexOf(panelid)
        if (index >= 0) {
            setAppViewHistory(appViewHistory.slice(0, index + 2))
        } else {
            setAppViewHistory([...appViewHistory, panelid])
        }

        setActivePanel(panelid)
    }, [])

    const go = useCallback((panelid, stateFields) => {
        let state = { ...stateFields, panelid: panelid }
        window.history.pushState(state, panelid)
        handleHistoryStateChange(state)
    }, [])

    const goBack = useCallback(() => {
        window.history.back()
    }, [])

    useEffect(() => {
        let selectedTheme = null

        if (themeOption == 'auto' || themeOption == null) {
            selectedTheme = autoThemeOption
        } else {
            selectedTheme = themeOption
        }


        switch (selectedTheme) {
            case 'dark':
                setAppScheme('space_gray')
                break
            default:
                setAppScheme('bright_light')
        }
    }, [autoThemeOption, themeOption])

    useEffect(() => {
        window.onpopstate = (event) => {
            handleHistoryStateChange(event.state)
        }

        const handler = ({ detail: { type, data } }) => {
            if (type == 'VKWebAppUpdateConfig') {
                setAutoThemeOption(data.scheme === 'space_gray' || data.scheme === 'client_dark' ? 'dark' : 'light')
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

            if (themeOptionData == null || themeOptionData == '') {
                setThemeOption('auto')
            } else {
                setThemeOption(String(themeOptionData))
            }
            if (isSlideshowDoneData == null || isSlideshowDoneData == '') {
                setIsSlideshowDone(false)
            } else {
                setIsSlideshowDone(Boolean(isSlideshowDoneData))
            }
        }
        fetchThingsFromStorage()

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

        // TODO: хэднлить vk_ref (с котекстом из истории) когда пофиксят

        const fetchUserIDInLocationHash = async (lochash) => {
            try {
                let loc = lochash.substring(lochash.indexOf('#') + 1)
                let userid = loc.substring(loc.indexOf('@') + 1)

                if (userid !== '') {
                    let user = (await vkUsersGet(userid))[0]
                    if (!user) {
                        throw new Error('`user` is empty')
                    }

                    setPanelProfileUser(user)
                }
            } catch (err) {
                console.error(err)
            }

            setIsFetchUserFromLocationDone(true)
        }
        fetchUserIDInLocationHash(window.location.hash)

        const handler = ({ detail: { type, data } }) => {
            if (type == 'VKWebAppLocationChanged') {
                fetchUserIDInLocationHash(data.location)
            }
        }

        bridge.subscribe(handler)

        return () => { bridge.unsubscribe(handler) }
    }, [isVKWebAppInitDone])

    useEffect(() => {
        if (!isSlideshowDone || !isFetchUserFromLocationDone) {
            return
        }

        if (panelProfileUser != null) {
            go('profile', { panelProfileUser: panelProfileUser })
        } else {
            setActivePanel('home')
        }
    }, [isSlideshowDone, isFetchUserFromLocationDone])

    const slideshowDoneCallback = useCallback(async () => {
        setActivePanel('slideshow')
        setIsSlideshowDone(true)

        try {
            await bridge.send('VKWebAppStorageSet', { key: 'is_slideshow_done', value: String(true) })
        } catch (err) {
            console.error(err)
        }
    }, [])

    let currentActivePanel = null

    if (themeOption != null && isSlideshowDone != null && currentUser != null && isFetchUserFromLocationDone) {
        if (isSlideshowDone) {
            if (activePanel != null) {
                currentActivePanel = activePanel
            } else {
                currentActivePanel = 'loading'
            }
        } else {
            currentActivePanel = 'slideshow'
        }
    } else {
        currentActivePanel = 'loading'
    }

    return (
        <ConfigProvider
            isWebView={true}
            scheme={appScheme}
        >
            <View
                activePanel={currentActivePanel}
                popout={popout}
                history={appViewHistory}
                onSwipeBack={popout ? null : platformSwitch(['mobile_iphone', 'mobile_iphone_messenger'], () => goBack)}
            >
                <Loading id='loading' />

                <Slideshow id='slideshow' doneCallback={slideshowDoneCallback} />

                <Home id='home' go={go} setPopout={setPopout} changeThemeOption={changeThemeOption} currentUser={currentUser} />
                <Friends id='friends' go={go} goBack={goBack} />
                <Profile id='profile' goBack={goBack} setPopout={setPopout} currentUser={currentUser} user={panelProfileUser} />
            </View>
        </ConfigProvider >
    )
}

// if (process.env.NODE_ENV === 'development') {
//     import('./eruda') //runtime download
// }

ReactDOM.render(<React.StrictMode><App /></React.StrictMode>, document.getElementById('root'))
