import React, { useCallback, useEffect, useState } from 'react'
import {
	Panel,
	PanelHeader,
	PanelHeaderContent,
	Button,
	Input,
	FormLayout,
	Header,
	Group,
	Placeholder,
	PanelSpinner,
	Tabs,
	TabsItem,
	SimpleCell,
	Link,
	Separator,
	Footer,
} from '@vkontakte/vkui'

import {
	Icon28Profile,
	Icon28UserOutline,
	Icon28QrCodeOutline,
	Icon28FavoriteOutline,
	Icon28HomeOutline,
	Icon28LogoVkOutline,
	Icon28SmartphoneOutline,
	Icon56HistoryOutline,
} from '@vkontakte/icons'

import bridge from '@vkontakte/vk-bridge'

import {
	showErrorSnackbar,
	showSuccessSnackbar,
} from './_showSnackbar'

import UsersList from './_UsersList'

import platformSwitch from './_platformSwitch'

function Home({ id, go }) {
	const [currentTab, setCurrentTab] = useState('profile_selection')

	let view = null

	switch (currentTab) {
		case 'profile_selection':
			view = <ProfileSelection go={go} />
			break
		case 'other':
			view = <Other />
			break
		default:
			view = null
	}

	return (
		<Panel id={id}>
			<PanelHeader>
				<PanelHeaderContent>Sociorate</PanelHeaderContent>
			</PanelHeader>

			<Tabs>
				<TabsItem
					onClick={() => {
						if (currentTab !== 'profile_selection') {
							setCurrentTab('profile_selection')
						}
					}}
					selected={currentTab === 'profile_selection'}
				>Выбор профиля</TabsItem>
				<TabsItem
					onClick={() => {
						if (currentTab !== 'other') {
							setCurrentTab('other')
						}
					}}
					selected={currentTab === 'other'}
				>Прочее</TabsItem>
			</Tabs>

			{view}
		</Panel>
	)
}

function LastViewedProfilesPlaceholder() {
	return (
		<Placeholder
			header="Оценивайте людей"
			icon={<Icon56HistoryOutline />}
		>Последние открытые профили будут отображаться здесь</Placeholder>
	)
}

function ProfileSelection({ go }) {
	const [snackbar, setSnackbar] = useState(null)
	const [userIDInput, setUserIDInput] = useState('')
	const [lastProfilesView, setLastProfilesView] = useState(null)

	useEffect(() => {
		const fetchLastViewedProfiles = async () => {
			setLastProfilesView(<PanelSpinner />)

			let data = ''

			try {
				data = (await bridge.send('VKWebAppStorageGet', { keys: ['last_viewed_profiles'] })).keys[0].value
			} catch (err) {
				console.error(err)
				showErrorSnackbar(setSnackbar, 'Не удалось загрузить последние открытые профили')
			}

			if (data === '') {
				setLastProfilesView(LastViewedProfilesPlaceholder())
				return
			}

			let users = []

			try {
				let accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: '' })
				users = (await bridge.send('VKWebAppCallAPIMethod', { method: 'users.get', params: { user_ids: data, fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response
			} catch (err) {
				if (err.error_data.error_code !== 1) {
					console.error(err)
					showErrorSnackbar(setSnackbar, 'Не удалось загрузить профили')
				}
			}

			if (users.length === 0) {
				setLastProfilesView(LastViewedProfilesPlaceholder())
				return
			}

			setLastProfilesView(<UsersList go={go} users={users} />)
		}
		fetchLastViewedProfiles()
	}, [go])

	const loadUser = useCallback(async (stringWithUserID) => {
		try {
			let index = stringWithUserID.lastIndexOf('@')
			if (index === -1) {
				index = stringWithUserID.lastIndexOf('/')
			}

			let userid = stringWithUserID.substring(index + 1)

			let accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: '' })
			let user = (await bridge.send('VKWebAppCallAPIMethod', { method: 'users.get', params: { user_ids: userid, fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response[0]

			if (!user) {
				showErrorSnackbar(setSnackbar, 'Пользователь не найден')
				return
			}

			go('profile', user)
		} catch (err) {
			if (err.error_data.error_code === 1) {
				showErrorSnackbar(setSnackbar, 'Пользователь не найден')
			} else {
				console.error(err)
				showErrorSnackbar(setSnackbar, 'Не удалось загрузить профиль')
			}
		}
	}, [go])

	return (
		<React.Fragment>
			<Group>
				<SimpleCell before={<Icon28Profile />} onClick={async () => {
					try {
						let user = await bridge.send('VKWebAppGetUserInfo')
						if (user) {
							go('profile', user)
						}
					} catch (err) {
						console.error(err)
						showErrorSnackbar(setSnackbar, 'Не удалось получить информацию о текущем профиле')
					}
				}}>Мой профиль</SimpleCell>

				{platformSwitch(['mobile_android', 'mobile_iphone'],
					<SimpleCell before={<Icon28QrCodeOutline />} onClick={async () => {
						try {
							let code = (await bridge.send("VKWebAppOpenCodeReader")).code_data
							loadUser(code)
						} catch (err) {
							if (err.error_data.error_code !== 4) {
								console.error(err)
								showErrorSnackbar(setSnackbar, 'Не удалось запустить сканер QR кода')
							}
						}
					}}>Открыть по QR коду</SimpleCell>
				)}

				<SimpleCell before={<Icon28UserOutline />} onClick={() => { go('friends') }}>Выбрать из друзей</SimpleCell>

				<FormLayout>
					<Input top='Открыть по @ID или ссылке' value={userIDInput} onChange={(event) => {
						setUserIDInput(event.target.value)
					}} type='text' placeholder='Введите ID или ссылку' />
					<Button size='xl' onClick={async () => {
						if (userIDInput === '') {
							showErrorSnackbar(setSnackbar, 'Введите ID профиля ВКонтакте или ссылку.')
							return
						}

						loadUser(userIDInput)
					}}>Открыть</Button>
				</FormLayout>
			</Group>

			<Group header={<Header mode='secondary'>Последние открытые</Header>}>
				{lastProfilesView}
			</Group>

			{snackbar}
		</React.Fragment>
	)
}

// TODO: кнопка для смены темы (три режима: автоматический, тёмный, светлый)
// TODO: кнопка "Сообщить об ошибке"

function Other() {
	const [snackbar, setSnackbar] = useState(null)

	return (
		<Group>
			{platformSwitch(['mobile_android'],
				<SimpleCell before={<Icon28HomeOutline />} onClick={async () => {
					try {
						await bridge.send("VKWebAppAddToHomeScreen")
					} catch (err) {
						if (err.error_data.error_code !== 4) {
							console.error(err)
							showErrorSnackbar(setSnackbar, 'Не удалось добавить приложение на главный экран')
						}
						return
					}
					showSuccessSnackbar(setSnackbar, 'Спасибо, что добавили Sociorate на главный экран!')
				}}>Добавить на глав. экран</SimpleCell>
			)}

			{platformSwitch(['mobile_android', 'mobile_iphone'],
				<SimpleCell before={<Icon28FavoriteOutline />} onClick={async () => {
					try {
						await bridge.send("VKWebAppAddToFavorites")
					} catch (err) {
						if (err.error_data.error_code !== 4) {
							console.error(err)
							showErrorSnackbar(setSnackbar, 'Не удалось добавить приложение в избранные')
						}
						return
					}
					showSuccessSnackbar(setSnackbar, 'Спасибо, что добавили Sociorate в избранные!')
				}}>Добавить в избранные</SimpleCell>
			)}

			{platformSwitch(['mobile_web', 'desktop_web', 'mobile_android_messenger', 'mobile_iphone_messenger'],
				<SimpleCell before={<Icon28SmartphoneOutline />} onClick={async () => {
					try {
						await bridge.send("VKWebAppSendToClient")
					} catch (err) {
						if (err.error_data.error_code !== 4) {
							console.error(err)
							showErrorSnackbar(setSnackbar, 'Не удалось отправить уведомление')
						}
						return
					}
					showSuccessSnackbar(setSnackbar, 'Уведомление отправлено!')
				}}>Открыть в приложении ВК</SimpleCell>
			)}

			<Separator />

			<SimpleCell
				href='https://vk.com/sociorate' target='_blank'
				before={<Icon28LogoVkOutline />}
				description="Следите за новостями!"
			>Паблик Sociorate</SimpleCell>

			<Footer>Все эмодзи сделаны <Link href='https://openmoji.org/' target='_blank'>OpenMoji</Link> – проект свободных эмодзи и иконок. Лицензия: <Link href='https://creativecommons.org/licenses/by-sa/4.0/#' target='_blank'>CC BY-SA 4.0</Link><br />All emojis designed by <Link href='https://openmoji.org/' target='_blank'>OpenMoji</Link> – the open-source emoji and icon project. License: <Link href='https://creativecommons.org/licenses/by-sa/4.0/#' target='_blank'>CC BY-SA 4.0</Link></Footer>

			{snackbar}
		</Group>
	)
}

export default Home
