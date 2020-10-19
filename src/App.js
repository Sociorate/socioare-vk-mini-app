import '@vkontakte/vkui/dist/vkui.css'
import './grecaptcha-badge.css'

import React, {
	useState,
	useEffect,
	useCallback,
	useRef,
} from 'react'

import {
	ScreenSpinner,
	View,
} from '@vkontakte/vkui/'

import Home from './panels/Home'
import Friends from './panels/Friends'
import Profile from './panels/Profile'

import bridge from '@vkontakte/vk-bridge'

import ReCAPTCHA from "react-google-recaptcha"

// TODO: слайдшоу с объяснением работы

function App() {
	const [activePanel, setActivePanel] = useState('home')
	const [popout, setPopout] = useState(null)

	const [currentUserID, setCurrentUserID] = useState(null)
	const [userid, setUserID] = useState(null)

	const reCaptchaRef = useRef()
	const [reCaptchaTheme, setReCaptchaTheme] = useState('light')
	const [reCaptchaLoaded, setReCaptchaLoaded] = useState(false)


	useEffect(() => {
		const fetchCurrentUserID = async () => {
			let user = null

			try {
				user = await bridge.send('VKWebAppGetUserInfo')
			} catch (err) {
				console.error(err)
				return
			}

			if (user == null) {
				return
			}

			setCurrentUserID(user.id)
		}
		fetchCurrentUserID()

		const handler = ({ detail: { type, data } }) => {
			if (type === 'VKWebAppUpdateConfig') {
				const schemeAttribute = document.createAttribute('scheme')
				schemeAttribute.value = data.scheme ? data.scheme : 'client_light'
				setReCaptchaTheme(schemeAttribute.value === 'space_gray' ? 'dark' : 'light')
				document.body.attributes.setNamedItem(schemeAttribute)
			}
		}

		bridge.subscribe(handler)

		return () => { bridge.unsubscribe(handler) }
	}, [])

	const go = useCallback((panelid, userScreenName) => {
		if (userScreenName) {
			setUserID(userScreenName)
		}

		setActivePanel(panelid)
	}, [])

	useEffect(() => {
		let location = window.location.hash.substring(window.location.hash.indexOf('#') + 1)

		let index = location.indexOf('@')
		if (index !== -1) {
			let userid = location.substring(index + 1)
			if (userid !== '') {
				go('profile', userid)
			}
		}
	}, [go])

	return (
		<React.Fragment>
			<ReCAPTCHA
				ref={reCaptchaRef}
				theme={reCaptchaTheme}
				size="invisible"
				sitekey="6LcWr9gZAAAAACPguyvAWhIkyvQG8Doml7zTPxX2"
				asyncScriptOnLoad={() => {
					setReCaptchaLoaded(true)
				}}
			/>
			<View activePanel={reCaptchaLoaded ? activePanel : 'home'} popout={reCaptchaLoaded ? popout : <ScreenSpinner />}>
				<Home id='home' go={go} />
				<Friends id='friends' go={go} />
				<Profile id='profile' go={go} setPopout={setPopout} reCaptchaRef={reCaptchaRef} currentUserID={currentUserID} userid={userid} />
			</View>
		</React.Fragment>
	)
}

export default App
