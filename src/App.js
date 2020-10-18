import '@vkontakte/vkui/dist/vkui.css'

import React, {
	useState,
	useEffect,
	useCallback,
} from 'react'

import {
	View,
} from '@vkontakte/vkui/'

import Home from './panels/Home'
import Friends from './panels/Friends'
import Profile from './panels/Profile'

import bridge from '@vkontakte/vk-bridge'

function App() {
	const [activePanel, setActivePanel] = useState('home')
	const [popout, setPopout] = useState(null)

	const [currentUserID, setCurrentUserID] = useState(null)
	const [userid, setUserID] = useState(null)

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
		<View activePanel={activePanel} popout={popout}>
			<Home id='home' go={go} />
			<Friends id='friends' go={go} />
			<Profile id='profile' go={go} setPopout={setPopout} currentUserID={currentUserID} userid={userid} />
		</View>
	)
}

export default App
