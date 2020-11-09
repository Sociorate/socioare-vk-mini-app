import '@vkontakte/vkui/dist/vkui.css'
import './grecaptcha-badge.css'

import 'core-js/features/map'
import 'core-js/features/set'

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react'

import ReactDOM from 'react-dom'

import {
    View,
    Alert,
    Headline,
} from '@vkontakte/vkui/'

import Loading from './panels/Loading'
import Slideshow from './panels/Slideshow'
import Home from './panels/Home'
import Friends from './panels/Friends'
import Profile from './panels/Profile'

import bridge from '@vkontakte/vk-bridge'

import ReCAPTCHA from "react-google-recaptcha"

// TODO: роутинг (можно только чтоб кнопка назад работала на андройдах (и свайп на ios по совместительству))

var reCaptchaCallback = null

function App() {
    const [isVKWebAppInitDone, setIsVKWebAppInitDone] = useState(false)

    const [activePanel, setActivePanel] = useState('loading')
    const [popout, setPopout] = useState(null)

    const [currentUser, setCurrentUser] = useState(null)
    const [panelProfileUser, setPanelProfileUser] = useState(null)

    const reCaptchaRef = useRef()
    const [reCaptchaTheme, setReCaptchaTheme] = useState('light')
    const [isReCaptchaLoaded, setIsReCaptchaLoaded] = useState(false)

    const [autoTheme, setAutoTheme] = useState('light')
    const [themeOption, setThemeOption] = useState(null)

    const [isSlideshowDone, setIsSlideshowDone] = useState(null)

    useEffect(() => {
        const handler = ({ detail: { type, data } }) => {
            switch (type) {
                case 'VKWebAppUpdateConfig':
                    setAutoTheme(data.scheme === 'space_gray' ? 'dark' : 'light')
                    break
            }
        }

        const vkWebAppInit = async () => {
            bridge.subscribe(handler)

            try {
                await bridge.send('VKWebAppInit')
            } catch (err) {
                console.error(err)
            }

            setIsVKWebAppInitDone(true)
        }
        vkWebAppInit()

        return () => { bridge.unsubscribe(handler) }
    }, [])

    const executeReCaptcha = useCallback((callback) => {
        reCaptchaCallback = (token, error, haveExpired) => {
            if (!token && !error) {
                return
            }

            setPopout(null)

            if (haveExpired) {
                callback(null, new Error("Captcha have expired"))
            } else {
                callback(token, error)
            }

            reCaptchaRef.current.reset()
        }

        setPopout(
            <Alert
                actions={[{
                    title: 'Отмена',
                    autoclose: true,
                    mode: 'cancel'
                }]}
                onClose={() => {
                    reCaptchaCallback = null

                    setPopout(null)

                    reCaptchaRef.current.reset()
                }}
            >
                <Headline weight="regular">Проверка ReCAPTCHA...</Headline>
            </Alert>
        )

        reCaptchaRef.current.execute()
    }, [])

    const changeTheme = useCallback((themeName) => {
        const schemeAttribute = document.createAttribute('scheme')
        switch (themeName) {
            case 'dark':
                schemeAttribute.value = 'space_gray'
                setReCaptchaTheme('dark')
                break
            default:
                schemeAttribute.value = 'client_light'
                setReCaptchaTheme('light')
        }
        document.body.attributes.setNamedItem(schemeAttribute)
    }, [])

    useEffect(() => {
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

    const go = useCallback((panelid, user) => {
        if (user) {
            setPanelProfileUser(user)
        }

        setActivePanel(panelid)
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
                setThemeOption('ligth')
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

        const fetchUserInLocationHashAndCurrentUser = async () => {
            try {
                let userid = (new URLSearchParams(window.location.search)).get('vk_user_id')

                let accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: '' })
                let user = (await bridge.send('VKWebAppCallAPIMethod', { method: 'users.get', params: { user_ids: userid, fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response[0]
                if (!user) {
                    return
                }

                setCurrentUser(user)
            } catch (err) {
                console.error(err)
            }

            try {
                let userid = ''

                let location = window.location.hash.substring(window.location.hash.indexOf('#') + 1)
                let index = location.indexOf('@')
                if (index !== -1) {
                    userid = location.substring(index + 1)
                }

                if (userid === '') {
                    go('home')
                    return
                }

                let accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: '' })
                let user = (await bridge.send('VKWebAppCallAPIMethod', { method: 'users.get', params: { user_ids: userid, fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response[0]

                if (!user) {
                    throw new Error('`user` is empty')
                }

                go('profile', user)
            } catch (err) {
                go('home')
                console.error(err)
            }
        }
        fetchUserInLocationHashAndCurrentUser()
    }, [isVKWebAppInitDone])

    const isAppLoaded = isReCaptchaLoaded && isVKWebAppInitDone && themeOption != null && currentUser != null && isSlideshowDone != null


    const slideshowDoneCallback = useCallback(() => {
        async () => {
            setIsSlideshowDone(true)

            try {
                await bridge.send('VKWebAppStorageSet', { key: 'is_slideshow_done', value: String(true) })
            } catch (err) {
                console.error(err)
            }
        }
    }, [])

    return (
        <React.Fragment>
            <ReCAPTCHA
                ref={reCaptchaRef}
                theme={reCaptchaTheme}
                size="invisible"
                sitekey="6LcWr9gZAAAAACPguyvAWhIkyvQG8Doml7zTPxX2"
                asyncScriptOnLoad={() => {
                    setIsReCaptchaLoaded(true)
                }}
                onChange={(value) => {
                    if (reCaptchaCallback != null) {
                        reCaptchaCallback(value, null, false)
                    }
                }}
                onErrored={(error) => {
                    if (reCaptchaCallback != null) {
                        reCaptchaCallback(null, error, false)
                    }
                }}
                onExpired={() => {
                    if (reCaptchaCallback != null) {
                        reCaptchaCallback(null, null, true)
                    }
                }}
            />

            <View activePanel={isAppLoaded ? (isSlideshowDone ? activePanel : 'slideshow') : 'loading'} popout={popout}>
                <Loading id='loading' />

                <Slideshow id='slideshow' go={go} doneCallback={slideshowDoneCallback} />

                <Home id='home' go={go} setPopout={setPopout} changeThemeOption={changeThemeOption} currentUser={currentUser} />
                <Friends id='friends' go={go} />
                <Profile id='profile' go={go} setPopout={setPopout} executeReCaptcha={executeReCaptcha} currentUser={currentUser} user={panelProfileUser} />
            </View>
        </React.Fragment>
    )
}

if (process.env.NODE_ENV === 'development') {
    import('./eruda') //runtime download
}

ReactDOM.render(<React.StrictMode><App /></React.StrictMode>, document.getElementById('root'))
