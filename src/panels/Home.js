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
	RichCell,
	Avatar,
	Alert,
	Text,
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
	vkUsersGet,
} from '../sociorate-api'

import {
	showErrorSnackbar,
	showSuccessSnackbar,
} from './_showSnackbar'

import createAverageRating from './_createAverageRating'

import UsersList from './_UsersList'

import platformSwitch from './_platformSwitch'

function Home({ id, go, setPopout, changeThemeOption, currentUser }) {
	if (currentUser == null) {
		return <Panel id={id} />
	}

	const [currentTab, setCurrentTab] = useState('profile_selection')
	const [snackbar, setSnackbar] = useState(null)

	let view = null

	switch (currentTab) {
		case 'profile_selection':
			view = <ProfileSelection go={go} setSnackbar={setSnackbar} setPopout={setPopout} currentUser={currentUser} />
			break
		case 'other':
			view = <Other setSnackbar={setSnackbar} setPopout={setPopout} changeThemeOption={changeThemeOption} />
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

			{snackbar}
		</Panel>
	)
}

Home.propTypes = {
	id: PropTypes.string.isRequired,
	go: PropTypes.func.isRequired,
	setPopout: PropTypes.func.isRequired,
	changeThemeOption: PropTypes.func.isRequired,
	currentUser: PropTypes.shape({
		id: PropTypes.number.isRequired,
		screen_name: PropTypes.string.isRequired,
		first_name: PropTypes.string.isRequired,
		last_name: PropTypes.string.isRequired,
		photo_200: PropTypes.string.isRequired,
	}),
}

function LastViewedProfilesPlaceholder() {
	return (
		<Placeholder
			header="Оценивайте"
			icon={<Icon56HistoryOutline />}
		>Последние открытые профили будут отображаться здесь</Placeholder>
	)
}

let lastUserIDInput = ''

function ProfileSelection({ go, setSnackbar, setPopout, currentUser }) {
	const [isFetching, setIsFetching] = useState(false)

	const [currentUserAverageRatingEmoji, setCurrentUserAverageRatingEmoji] = useState(null)
	const [userIDInput, setUserIDInput] = useState(lastUserIDInput)
	const [lastProfilesView, setLastProfilesView] = useState(null)

	const [enableButtonClean, setEnableButtonClean] = useState(false)

	useEffect(() => {
		lastUserIDInput = userIDInput
	}, [userIDInput])

	const fetchCurrentUserRating = useCallback(async () => {
		try {
			setCurrentUserAverageRatingEmoji(null)

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
		try {
			setLastProfilesView(<PanelSpinner />)

			let userids = String((await bridge.send('VKWebAppStorageGet', { keys: ['last_viewed_profiles'] })).keys[0].value)
			if (userids === '') {
				setLastProfilesView(<LastViewedProfilesPlaceholder />)
				return
			}

			let users = []

			try {
				users = await vkUsersGet(userids)
			} catch (err) {
				if (err.error_code === 113) {
					return
				} else {
					throw err
				}
			}

			if (!users || users.length === 0) {
				setLastProfilesView(<LastViewedProfilesPlaceholder />)
				return
			}

			setLastProfilesView(<UsersList go={go} users={users} />)
			setEnableButtonClean(true)
		} catch (err) {
			console.error(err)
			setLastProfilesView(null)
			setEnableButtonClean(false)
			showErrorSnackbar(setSnackbar, 'Не удалось загрузить последние открытые профили')
		}
	}, [])

	useEffect(() => {
		fetchCurrentUserRating()
		fetchLastViewedProfiles()
	}, [])

	const loadUser = useCallback(async (stringWithUserID) => {
		let index = stringWithUserID.lastIndexOf('@')
		if (index === -1) {
			index = stringWithUserID.lastIndexOf('/')
		}

		let userid = stringWithUserID.substring(index + 1)

		let user = null

		try {
			user = (await vkUsersGet(userid))[0]
		} catch (err) {
			if (err.error_code === 113) {
				showErrorSnackbar(setSnackbar, 'Пользователь не найден')
			} else {
				console.error(err)
				showErrorSnackbar(setSnackbar, 'Не удалось загрузить профиль')
			}
		}

		if (!user) {
			showErrorSnackbar(setSnackbar, 'Пользователь не найден')
			return
		}

		go('profile', { panelProfileUser: user })
	}, [])

	return (
		<PullToRefresh
			onRefresh={async () => {
				setSnackbar(null)

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
				<RichCell
					style={{ borderRadius: 'inherit' }}
					after={currentUserAverageRatingEmoji}
					before={<Avatar size={56} src={currentUser.photo_200} />}
					caption='Мой профиль'
					onClick={async () => {
						try {
							go('profile', { panelProfileUser: currentUser })
						} catch (err) {
							console.error(err)
							showErrorSnackbar(setSnackbar, 'Не удалось получить информацию о текущем профиле')
						}
					}}>{`${currentUser.first_name} ${currentUser.last_name}`}</RichCell>

				{platformSwitch(['mobile_android', 'mobile_iphone'], () => (
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
									showErrorSnackbar(setSnackbar, 'Не удалось запустить сканер QR-кода')
								}
							}
						}}>Открыть по QR-коду</SimpleCell>
				))}

				<SimpleCell
					style={{ borderRadius: 'inherit' }}
					before={<Icon28UserOutline />}
					onClick={async () => {
						let friend = null
						let isErrNotSupportedPlatform = false

						try {
							friend = (await bridge.send('VKWebAppGetFriends', { multi: false })).users[0]
						} catch (err) {
							switch (err.error_data.error_code) {
								case 4:
									return
								case 6:
									isErrNotSupportedPlatform = true
									break
								default:
									console.error(err)
									showErrorSnackbar(setSnackbar, 'Не удалось открыть список друзей')
									return
							}
						}

						if (friend == null && !isErrNotSupportedPlatform) {
							return
						}

						if (friend != null) {
							let fetchedFriend = null
							try {
								fetchedFriend = (await vkUsersGet(friend.id))[0]
							} catch (err) {
								console.error(err)
							}

							go('profile', { panelProfileUser: fetchedFriend ? fetchedFriend : friend })

							return
						}

						go('friends')
					}}>Выбрать из друзей</SimpleCell>

				<FormLayout>
					<Input
						top='По @ID или ссылке ВК/Sociorate'
						value={userIDInput}
						onChange={(event) => {
							setUserIDInput(event.target.value)
						}}
						type='text'
						placeholder='Введите ID или ссылку'
					/>
					<Button size='xl' onClick={async () => {
						if (userIDInput === '') {
							showErrorSnackbar(setSnackbar, 'Введите ID или ссылку ВК/Sociorate.')
							return
						}

						loadUser(userIDInput)
					}}>Открыть</Button>
				</FormLayout>
			</Group>

			<Group header={<Header
				mode='secondary'
				style={{
					WebkitUserSelect: 'none',
					WebkitTouchCallout: 'none',
					MozUserSelect: 'none',
					msUserSelect: 'none',
					userSelect: 'none',
				}}
				aside={enableButtonClean ? <Button
					mode="tertiary"
					onClick={() => {
						setPopout(
							<Alert
								onClose={() => {
									setPopout(null)
								}}
								actions={[{
									title: "Отмена",
									autoclose: true,
									mode: 'cancel',
								}, {
									title: 'Очистить',
									autoclose: true,
									mode: 'destructive',
									action: async () => {
										try {
											await bridge.send('VKWebAppStorageSet', { key: 'last_viewed_profiles', value: "" })
											setLastProfilesView(<LastViewedProfilesPlaceholder />)
											setEnableButtonClean(false)
										} catch (err) {
											console.error(err)
											showErrorSnackbar(setSnackbar, "Не удалось очистить список последних открытых профилей")
										}
									}
								}]}
							>
								<Text>Вы уверены, что хотите очистить список последних открытых профилей?</Text>
							</Alert>
						)
					}}
				>Очистить</Button> : null}
			>Последние открытые</Header>}>
				{lastProfilesView}
			</Group>

		</PullToRefresh>
	)
}

ProfileSelection.propTypes = {
	go: PropTypes.func.isRequired,
	setSnackbar: PropTypes.func.isRequired,
	setPopout: PropTypes.func.isRequired,
	currentUser: PropTypes.shape({
		id: PropTypes.number.isRequired,
		screen_name: PropTypes.string.isRequired,
		first_name: PropTypes.string.isRequired,
		last_name: PropTypes.string.isRequired,
		photo_200: PropTypes.string.isRequired,
	}).isRequired,
}
let isAppInFavourites = (new URLSearchParams(window.location.search)).get('vk_is_favorite') == '1'

function Other({ setSnackbar, setPopout, changeThemeOption }) {
	const [isAddToHomeScreenDisabled, setIsAddToHomeScreenDisabled] = useState(false)
	const [isAddToFavouritesDisabled, setIsAddToFavouritesDisabled] = useState(isAppInFavourites)
	const [isOpenInAppDisabled, setIsOpenInAppDisabled] = useState(false)

	return (
		<Group>
			{platformSwitch(['mobile_android'], () => (
				<SimpleCell
					disabled={isAddToHomeScreenDisabled}
					before={
						<Icon28HomeOutline style={{ color: isAddToHomeScreenDisabled ? 'var(--dynamic_gray)' : null }} />
					}
					onClick={isAddToHomeScreenDisabled ? null : async () => {
						try {
							await bridge.send("VKWebAppAddToHomeScreen")
						} catch (err) {
							if (err.error_data.error_code !== 4) {
								console.error(err)
								showErrorSnackbar(setSnackbar, 'Не удалось добавить приложение на главный экран')
							}
							return
						}

						setIsAddToHomeScreenDisabled(true)

						showSuccessSnackbar(setSnackbar, 'Спасибо, что добавили Sociorate на главный экран!')
					}}>Добавить на глав. экран</SimpleCell>
			))}

			{platformSwitch(['mobile_android', 'mobile_iphone'], () => (
				<SimpleCell
					disabled={isAddToFavouritesDisabled}
					before={
						<Icon28FavoriteOutline style={{ color: isAddToFavouritesDisabled ? 'var(--dynamic_gray)' : null }} />
					}
					onClick={isAddToFavouritesDisabled ? null : async () => {
						try {
							await bridge.send("VKWebAppAddToFavorites")
						} catch (err) {
							if (err.error_data.error_code !== 4) {
								console.error(err)
								showErrorSnackbar(setSnackbar, 'Не удалось добавить приложение в избранное')
							}
							return
						}

						isAppInFavourites = true
						setIsAddToFavouritesDisabled(true)

						showSuccessSnackbar(setSnackbar, 'Спасибо, что добавили Sociorate в избранное!')
					}}>Добавить в избранное</SimpleCell>
			))}

			{platformSwitch(['mobile_web', 'desktop_web', 'mobile_android_messenger', 'mobile_iphone_messenger'], () => (
				<SimpleCell
					disabled={isOpenInAppDisabled}
					before={
						<Icon28SmartphoneOutline style={{ color: isOpenInAppDisabled ? 'var(--dynamic_gray)' : null }} />
					}
					onClick={isOpenInAppDisabled ? null : async () => {
						try {
							await bridge.send("VKWebAppSendToClient")
						} catch (err) {
							if (err.error_data.error_code !== 4) {
								console.error(err)
								showErrorSnackbar(setSnackbar, 'Не удалось отправить уведомление')
							}
							return
						}

						setIsOpenInAppDisabled(true)

						showSuccessSnackbar(setSnackbar, 'Уведомление отправлено!')
					}}>Открыть в приложении ВК</SimpleCell>
			))}

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
		</Group>
	)
}

Other.propTypes = {
	setSnackbar: PropTypes.func.isRequired,
	setPopout: PropTypes.func.isRequired,
	changeThemeOption: PropTypes.func.isRequired,
}

export default Home
