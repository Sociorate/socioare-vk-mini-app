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
    ScreenSpinner,
    View,
} from '@vkontakte/vkui/'

import Home from './panels/Home'
import Friends from './panels/Friends'
import Profile from './panels/Profile'

import bridge from '@vkontakte/vk-bridge'

import ReCAPTCHA from "react-google-recaptcha"

// Init VK Mini App
bridge.send('VKWebAppInit')

window.recaptchaOptions = { useRecaptchaNet: true }

// TODO: слайдшоу с объяснением работы
// TODO: блять ничего не должно тормозить

function App() {
    const [activePanel, setActivePanel] = useState('home')
    const [popout, setPopout] = useState(null)

    const [currentUserID, setCurrentUserID] = useState(null)
    const [panelProfileUser, setPanelProfileUser] = useState(null)

    const reCaptchaRef = useRef()
    const [reCaptchaTheme, setReCaptchaTheme] = useState('light')
    const [reCaptchaLoaded, setReCaptchaLoaded] = useState(false)

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
        const fetchCurrentUserID = async () => {
            try {
                let user = await bridge.send('VKWebAppGetUserInfo')
                if (!user.id) {
                    return
                }
                setCurrentUserID(user.id)
            } catch (err) {
                console.error(err)
                return
            }
        }
        fetchCurrentUserID()

        const handler = ({ detail: { type, data } }) => {
            if (type === 'VKWebAppUpdateConfig') {
                changeTheme(data.scheme === 'space_gray' ? 'dark' : 'light')
            }
        }

        bridge.subscribe(handler)

        return () => { bridge.unsubscribe(handler) }
    }, [changeTheme])

    const go = useCallback((panelid, user) => {
        if (user) {
            setPanelProfileUser(user)
        }

        setActivePanel(panelid)
    }, [])

    useEffect(() => {
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
                    return
                }

                go('profile', user)
            } catch (err) {
                console.error(err)
            }
        }
        fetchUserFromLocationHash()
    }, [go])

    return (
        <ReCAPTCHA
            ref={reCaptchaRef}
            theme={reCaptchaTheme}
            size="invisible"
            sitekey="6LcWr9gZAAAAACPguyvAWhIkyvQG8Doml7zTPxX2"
            asyncScriptOnLoad={() => {
                setReCaptchaLoaded(true)
            }}
        >
            <View activePanel={reCaptchaLoaded ? activePanel : 'home'} popout={reCaptchaLoaded ? popout : <ScreenSpinner />}>
                <Home id='home' go={go} />
                <Friends id='friends' go={go} />
                <Profile id='profile' go={go} setPopout={setPopout} reCaptchaRef={reCaptchaRef} currentUserID={currentUserID} user={panelProfileUser} />
            </View>
        </ReCAPTCHA>
    )
}

ReactDOM.render(<React.StrictMode><App /></React.StrictMode>, document.getElementById('root'))

if (process.env.NODE_ENV === 'development') {
    import('./eruda').then(({ default: eruda }) => { }) //runtime download
}
