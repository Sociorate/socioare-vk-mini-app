import React, {
	useCallback,
	useEffect,
	useState,
} from 'react'

import PropTypes from 'prop-types'

import {
	Panel,
	PanelHeader,
	PanelHeaderContent,
	PullToRefresh,
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
	ActionSheet,
	ActionSheetItem,
	Card,
	CardGrid,
	RichCell,
	Avatar,
} from '@vkontakte/vkui'

import {
	Icon28UserOutline,
	Icon28QrCodeOutline,
	Icon28FavoriteOutline,
	Icon28HomeOutline,
	Icon28LogoVkOutline,
	Icon28SmartphoneOutline,
	Icon28BugOutline,
	Icon28PaintRollerOutline,
	Icon28SmileOutline,
	Icon28MoonOutline,
	Icon56HistoryOutline,
} from '@vkontakte/icons'

import bridge from '@vkontakte/vk-bridge'

import {
	getRating,
} from '../sociorate-api'

import {
	showErrorSnackbar,
	showSuccessSnackbar,
} from './_showSnackbar'

import createAverageRating from './_createAverageRating'

import UsersList from './_UsersList'

import platformSwitch from './_platformSwitch'

// TODO: сделать вкладки сменяемыми свайпами

function Home({ id, go, setPopout, changeThemeOption, currentUser }) {
	if (currentUser == null) {
		return <Panel id={id} />
	}

	const [currentTab, setCurrentTab] = useState('profile_selection')

	let view = null

	switch (currentTab) {
		case 'profile_selection':
			view = <ProfileSelection go={go} currentUser={currentUser} />
			break
		case 'other':
			view = <Other setPopout={setPopout} changeThemeOption={changeThemeOption} />
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

Home.propTypes = {
	id: PropTypes.string.isRequired,
	go: PropTypes.func.isRequired,
	setPopout: PropTypes.func.isRequired,
	changeThemeOption: PropTypes.func.isRequired,
	currentUser: PropTypes.shape({
		id: PropTypes.number,
		screen_name: PropTypes.string,
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		photo_200: PropTypes.string,
	}),
}

function LastViewedProfilesPlaceholder() {
	return (
		<Placeholder
			header="Оценивайте людей"
			icon={<Icon56HistoryOutline />}
		>Последние открытые профили будут отображаться здесь</Placeholder>
	)
}

function ProfileSelection({ go, currentUser }) {
	const [isFetching, setIsFetching] = useState(false)

	const [currentUserAverageRatingEmoji, setCurrentUserAverageRatingEmoji] = useState(null)
	const [userIDInput, setUserIDInput] = useState('')
	const [lastProfilesView, setLastProfilesView] = useState(null)

	const [snackbar, setSnackbar] = useState(null)

	const fetchCurrentUserRating = useCallback(async () => {
		try {
			let ratingCounts = (await getRating(currentUser.id)).rating_counts

			let [averageRating, averageRatingEmoji] = createAverageRating(ratingCounts)

			if (averageRatingEmoji != null) {
				setCurrentUserAverageRatingEmoji(<img style={{
					height: '56px',
					position: 'absolute',
					right: 0,
					bottom: 0,
				}} src={averageRatingEmoji} alt={averageRating} />)
			}
		} catch (err) {
			console.error(err)
		}
	}, [])

	const fetchLastViewedProfiles = useCallback(async () => {
		setLastProfilesView(<PanelSpinner />)

		let data = ''

		try {
			data = String((await bridge.send('VKWebAppStorageGet', { keys: ['last_viewed_profiles'] })).keys[0].value)
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
				showErrorSnackbar(setSnackbar, 'Не удалось загрузить последние открытые профили')
			}
		}

		if (users.length === 0) {
			setLastProfilesView(LastViewedProfilesPlaceholder())
			return
		}

		setLastProfilesView(<UsersList go={go} users={users} />)
	}, [go])

	useEffect(() => {
		fetchCurrentUserRating()
		fetchLastViewedProfiles()
	}, [fetchCurrentUserRating, fetchLastViewedProfiles])

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
		<PullToRefresh
			onRefresh={async () => {
				setIsFetching(true)

				let i = 0
				const done = () => {
					i++
					if (i == 2) {
						setIsFetching(false)
					}
				}

				fetchCurrentUserRating().then(() => { done() })
				fetchLastViewedProfiles().then(() => { done() })
			}}
			isFetching={isFetching}
		>
			<Group separator={false}>
				<CardGrid>
					<Card size="l" mode='outline'>
						<RichCell
							style={{ borderRadius: 'inherit' }}
							after={currentUserAverageRatingEmoji}
							before={<Avatar size={56} src={currentUser.photo_200} />}
							caption='Мой профиль'
							onClick={async () => {
								try {
									go('profile', currentUser)
								} catch (err) {
									console.error(err)
									showErrorSnackbar(setSnackbar, 'Не удалось получить информацию о текущем профиле')
								}
							}}>{`${currentUser.first_name} ${currentUser.last_name}`}</RichCell>
					</Card>

					{platformSwitch(['mobile_android', 'mobile_iphone'],
						<Card size="l">
							<SimpleCell
								style={{ borderRadius: 'inherit' }}
								before={<Icon28QrCodeOutline />}
								onClick={async () => {
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
						</Card>
					)}

					<Card size="l">
						<SimpleCell
							style={{ borderRadius: 'inherit' }}
							before={<Icon28UserOutline />}
							onClick={() => { go('friends') }}>Выбрать из друзей</SimpleCell>
					</Card>

					<Card mode='outline' size="l">
						<FormLayout>
							<Input top='По @ID или ссылке ВК/Sociorate' value={userIDInput} onChange={(event) => {
								setUserIDInput(event.target.value)
							}} type='text' placeholder='Введите ID или ссылку' />
							<Button size='xl' onClick={async () => {
								if (userIDInput === '') {
									showErrorSnackbar(setSnackbar, 'Введите ID или ссылку ВК/Sociorate.')
									return
								}

								loadUser(userIDInput)
							}}>Открыть</Button>
						</FormLayout>
					</Card>
				</CardGrid>
			</Group>

			<Group header={<Header mode='secondary'>Последние открытые</Header>}>
				{lastProfilesView}
			</Group>

			{snackbar}
		</PullToRefresh>
	)
}

ProfileSelection.propTypes = {
	go: PropTypes.func,
	currentUser: PropTypes.shape({
		id: PropTypes.number,
		screen_name: PropTypes.string,
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		photo_200: PropTypes.string,
	}),
}

function Other({ setPopout, changeThemeOption }) {
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
							showErrorSnackbar(setSnackbar, 'Не удалось добавить приложение в избранное')
						}
						return
					}
					showSuccessSnackbar(setSnackbar, 'Спасибо, что добавили Sociorate в избранное!')
				}}>Добавить в избранное</SimpleCell>
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

			<SimpleCell
				href='https://vk.me/sociorate' target='_blank'
				before={<Icon28BugOutline />}
			>
				Сообщить об ошибке
			</SimpleCell>

			<Separator />

			<SimpleCell
				before={<Icon28PaintRollerOutline />}
				onClick={() => {
					setPopout(
						<ActionSheet onClose={() => { setPopout(null) }}>
							<ActionSheetItem autoclose before={<Icon28SmileOutline />} onClick={() => { changeThemeOption("light") }}>Светлая</ActionSheetItem>
							<ActionSheetItem autoclose before={<Icon28MoonOutline />} onClick={() => { changeThemeOption("dark") }}>Тёмная</ActionSheetItem>
							<ActionSheetItem autoclose mode="cancel" onClick={() => { changeThemeOption("auto") }}>Автоматически</ActionSheetItem>
						</ActionSheet>
					)
				}}
			>
				Сменить цветовую тему
			</SimpleCell>

			<Footer>В этом приложении используются (С ИЗМЕНЕНИЯМИ) эмодзи <Link href='https://openmoji.org/' target='_blank'>OpenMoji</Link> – проект свободных эмодзи и иконок. Лицензия: <Link href='https://creativecommons.org/licenses/by-sa/4.0/#' target='_blank'>CC BY-SA 4.0</Link><br />In this app are used (WITH CHANGES) <Link href='https://openmoji.org/' target='_blank'>OpenMoji</Link> emojis – the open-source emoji and icon project. License: <Link href='https://creativecommons.org/licenses/by-sa/4.0/#' target='_blank'>CC BY-SA 4.0</Link></Footer>

			{snackbar}
		</Group>
	)
}

Other.propTypes = {
	setPopout: PropTypes.func,
	changeThemeOption: PropTypes.func,
}

export default Home
