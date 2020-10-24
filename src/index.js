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
    Panel,
    View,
    ScreenSpinner,
    Alert,
    Headline,
} from '@vkontakte/vkui/'

import Slideshow from './panels/Slideshow'
import Home from './panels/Home'
import Friends from './panels/Friends'
import Profile from './panels/Profile'

import bridge from '@vkontakte/vk-bridge'

import ReCAPTCHA from "react-google-recaptcha"

window.recaptchaOptions = { useRecaptchaNet: true }

// TODO: поле с id панели которая должна открыться после слайдшоу 
// TODO: роутинг (можно только чтоб кнопка назад работала на андройдах (и свайп на ios по совместительству))

var reCaptchaCallback = null

function App() {
    const [vkWebAppInitDone, setVKWebAppInitDone] = useState(false)

    const [activePanel, setActivePanel] = useState('home')
    const [popout, setPopout] = useState(null)

    const [currentUserID, setCurrentUserID] = useState(null)
    const [panelProfileUser, setPanelProfileUser] = useState(null)

    const reCaptchaRef = useRef()
    const [reCaptchaTheme, setReCaptchaTheme] = useState('light')
    const [reCaptchaLoaded, setReCaptchaLoaded] = useState(false)

    const [autoTheme, setAutoTheme] = useState('light')
    const [themeOption, setThemeOption] = useState('auto')
    const [isThemeLoaded, setIsThemeLoaded] = useState(false)

    const [isSlideshowDone, setIsSlideshowDone] = useState(null)

    useEffect(() => {
        const handler = ({ detail: { type, data } }) => {
            if (type === 'VKWebAppUpdateConfig') {
                setAutoTheme(data.scheme === 'space_gray' ? 'dark' : 'light')
            }
        }

        const vkWebAppInit = async () => {
            bridge.subscribe(handler)

            try {
                await bridge.send('VKWebAppInit')
            } catch (err) {
                console.error(err)
            }

            setVKWebAppInitDone(true)
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
    }, [autoTheme, changeTheme, themeOption])

    const changeThemeOption = useCallback(async (newThemeOption) => {
        setThemeOption(newThemeOption)

        try {
            await bridge.send('VKWebAppStorageSet', { key: 'theme_option', value: newThemeOption })
        } catch (err) {
            console.error(err)
        }
    }, [])

    useEffect(() => {
        const fetchThingsFromStorage = async () => {
            let storedThemeOption = null
            try {
                storedThemeOption = (await bridge.send('VKWebAppStorageGet', { keys: ['theme_option', 'is_slideshow_done'] })).keys[0].value
            } catch (err) {
                console.error(err)
            }
            setThemeOption(String(storedThemeOption))
            setIsThemeLoaded(true)

            let storedIsSlideshowDone = null

            try {
                storedIsSlideshowDone = (await bridge.send('VKWebAppStorageGet', { keys: ['is_slideshow_done'] })).keys[0].value
            } catch (err) {
                console.error(err)
            }

            setIsSlideshowDone(Boolean(storedIsSlideshowDone))
        }
        fetchThingsFromStorage()

        const fetchCurrentUserID = async () => {
            try {
                let user = await bridge.send('VKWebAppGetUserInfo')
                if (!user.id) {
                    return
                }
                setCurrentUserID(user.id)
            } catch (err) {
                console.error(err)
            }
        }
        fetchCurrentUserID()
    }, [vkWebAppInitDone])

    const go = useCallback((panelid, user) => {
        if (user) {
            setPanelProfileUser(user)
        }

        setActivePanel(panelid)
    }, [])

    useEffect(() => {
        if (!vkWebAppInitDone) {
            return
        }

        const fetchUserFromLocationHash = async () => {
            try {
                let userid = ''

                let location = window.location.hash.substring(window.location.hash.indexOf('#') + 1)
                let index = location.indexOf('@')
                if (index !== -1) {
                    userid = location.substring(index + 1)
                }

                if (userid === '') {
                    return
                }

                let accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: '' })
                let user = (await bridge.send('VKWebAppCallAPIMethod', { method: 'users.get', params: { user_ids: userid, fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response[0]

                if (!user) {
                    throw new Error('`user` is empty')
                }

                go('profile', user)
            } catch (err) {
                console.error(err)
            }
        }
        fetchUserFromLocationHash()
    }, [vkWebAppInitDone, go])

    const isAppLoaded = reCaptchaLoaded && vkWebAppInitDone && isThemeLoaded && currentUserID && isSlideshowDone != null

    return (
        <ReCAPTCHA
            ref={reCaptchaRef}
            theme={reCaptchaTheme}
            size="invisible"
            sitekey="6LcWr9gZAAAAACPguyvAWhIkyvQG8Doml7zTPxX2"
            asyncScriptOnLoad={() => {
                setReCaptchaLoaded(true)
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
        >
            <View activePanel={isAppLoaded ? (isSlideshowDone ? activePanel : 'slideshow') : 'blank'} popout={isAppLoaded ? popout : <ScreenSpinner />}>
                <Panel id='blank' />
                <Slideshow id='slideshow' go={go} doneCallback={async () => {
                    setIsSlideshowDone(true)

                    try {
                        await bridge.send('VKWebAppStorageSet', { key: 'is_slideshow_done', value: 'true' })
                    } catch (err) {
                        console.error(err)
                    }
                }} />
                <Home id='home' go={go} setPopout={setPopout} changeThemeOption={changeThemeOption} />
                <Friends id='friends' go={go} />
                <Profile id='profile' go={go} setPopout={setPopout} executeReCaptcha={executeReCaptcha} currentUserID={currentUserID} user={panelProfileUser} />
            </View>
        </ReCAPTCHA>
    )
}

ReactDOM.render(<React.StrictMode><App /></React.StrictMode>, document.getElementById('root'))

if (process.env.NODE_ENV === 'development') {
    import('./eruda').then(({ default: eruda }) => { }) //runtime download
}
