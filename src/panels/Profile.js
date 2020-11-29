import React, {
	useEffect,
	useState,
	useCallback,
} from 'react'

import PropTypes from 'prop-types'

import {
	Panel,
	PanelHeader,
	Header,
	Button,
	Group,
	RichCell,
	Div,
	Avatar,
	Footer,
	Card,
	Subhead,
	PanelHeaderBack,
	PanelHeaderContent,
	PanelSpinner,
	Alert,
	Title,
	PullToRefresh,
	PromoBanner,
} from '@vkontakte/vkui'

import {
	Icon24ShareOutline,
	Icon24Qr,
	Icon24Link,
} from '@vkontakte/icons'

import bridge from '@vkontakte/vk-bridge'

import {
	postRating,
	getRating,
} from '../sociorate-api'

import vkQr from '@vkontakte/vk-qr'

import {
	showErrorSnackbar,
	showSuccessSnackbar,
} from './_showSnackbar'

import createAverageRating from './_createAverageRating'

import LoveEmoji from '../openmoji-edited/1F929.svg'
import LikeEmoji from '../openmoji-edited/1F60A.svg'
import NeutralEmoji from '../openmoji-edited/1F610.svg'
import DislikeEmoji from '../openmoji-edited/1F627.svg'
import HateEmoji from '../openmoji-edited/1F621.svg'

// TODO: рекламный блок для версии vk.com и m.vk.com
// TODO: кнопка поделиться в истории внизу профиля в моде простого текста

function Profile({ id, goBack, setPopout, currentUser, user }) {
	if (currentUser == null) {
		return <Panel id={id} />
	}

	const [snackbar, setSnackbar] = useState(null)

	useEffect(() => {
		if (user == null || user.id == currentUser.id) {
			return
		}

		const saveLastViewed = async () => {
			try {
				let data = String((await bridge.send('VKWebAppStorageGet', { keys: ['last_viewed_profiles'] })).keys[0].value)
				let fetchedUsers = data.split(',')

				const index = fetchedUsers.indexOf(String(user.id))
				if (index !== -1) {
					fetchedUsers.splice(index, 1)
				}

				fetchedUsers.unshift(String(user.id))

				for (let i = fetchedUsers.length; i > 9; i--) {
					fetchedUsers.pop()
				}

				await bridge.send('VKWebAppStorageSet', { key: 'last_viewed_profiles', value: String(fetchedUsers.join(',')) })
			} catch (err) {
				console.error(err)
			}
		}
		saveLastViewed()
	}, [user])

	return (
		<Panel id={id}>
			<PanelHeader
				left={<PanelHeaderBack onClick={() => { goBack() }} />}
			>
				<PanelHeaderContent>{user == null ? `Загрузка профиля` : `@${user.screen_name ? user.screen_name : `id${user.id}`} `}</PanelHeaderContent>
			</PanelHeader>

			{user ? <UserProfile setPopout={setPopout} setSnackbar={setSnackbar} currentUser={currentUser} user={user} /> : null}

			{snackbar}
		</Panel>
	)
}

Profile.propTypes = {
	id: PropTypes.string.isRequired,
	goBack: PropTypes.func.isRequired,
	setPopout: PropTypes.func.isRequired,
	currentUser: PropTypes.shape({
		id: PropTypes.number.isRequired,
	}),
	user: PropTypes.shape({
		id: PropTypes.number.isRequired,
		screen_name: PropTypes.string.isRequired,
		first_name: PropTypes.string.isRequired,
		last_name: PropTypes.string.isRequired,
		photo_200: PropTypes.string.isRequired,
		deactivated: PropTypes.string,
	})
}

function UserProfileRichCell({ setPopout, setSnackbar, user }) {
	return (
		<RichCell
			disabled
			before={<Avatar size={80} src={user.photo_200} />}
			style={{ cursor: 'default' }}
			actions={
				<div style={{ display: 'flex' }}>
					<Button mode='tertiary' stretched
						href={`https://vk.com/${user.screen_name ? user.screen_name : `id${user.id}`}`}
						target='_blank'
					><Icon24Link /></Button >

					<Button mode='tertiary' stretched onClick={async () => {
						try {
							await bridge.send('VKWebAppShare', { link: `https://vk.com/app7607943#@${user.screen_name ? user.screen_name : `id${user.id}`}` })
						} catch (err) {
							if (err.error_data.error_code !== 4) {
								console.error(err)
								showErrorSnackbar(setSnackbar, 'Не удалось открыть диалог Share')
							}
						}
					}}><Icon24ShareOutline /></Button>

					<Button mode='tertiary' stretched onClick={() => {
						const profileurl = `https://vk.com/app7607943#@${user.screen_name ? user.screen_name : `id${user.id}`}`

						let svgstr = vkQr.createQR(profileurl, {
							qrSize: 457,
							isShowLogo: true,
							ecc: 2,
						})

						let svgdataurl = `data:image/svg+xml,${encodeURIComponent(svgstr)}`

						setPopout(
							<Alert
								actions={[{
									title: 'Скопировать',
									autoclose: true,
									action: async () => {
										try {
											await bridge.send("VKWebAppCopyText", { text: profileurl })
											showSuccessSnackbar(setSnackbar, 'Ссылка скопирована в буфер обмена!')
										} catch (err) {
											if (err.error_data.error_code !== 4) {
												console.error(err)
												showErrorSnackbar(setSnackbar, 'Не удалось скопировать ссылку')
											}
										}
									}
								}, {
									title: 'Отмена',
									autoclose: true,
									mode: 'cancel'
								}]}
								onClose={() => { setPopout(null) }}
							>
								<img
									alt={profileurl}
									src={svgdataurl}
									style={{
										width: '96%',
										padding: '2%',
										backgroundColor: '#FFFFFF',
										border: '2% solid #FFFFFF',
										borderRadius: '12px',
									}}
								/>
							</Alert>
						)
					}}><Icon24Qr /></Button>
				</div>
			}
		>
			<Title level="2" weight="regular" style={{
				wordBreak: 'break-word',
				whiteSpace: 'pre-line',
				overflowWrap: 'break-word',
				wordWrap: 'break-word',
				msWordBreak: 'break-word',
				msHyphens: 'auto',
				MozHyphens: 'auto',
				WebkitHyphens: 'auto',
				hyphens: 'auto',
			}}>{`${user.first_name} ${user.last_name}`}</Title>
		</RichCell >
	)
}

UserProfileRichCell.propTypes = {
	setPopout: PropTypes.func.isRequired,
	setSnackbar: PropTypes.func.isRequired,
	user: PropTypes.shape({
		id: PropTypes.number.isRequired,
		screen_name: PropTypes.string.isRequired,
		first_name: PropTypes.string.isRequired,
		last_name: PropTypes.string.isRequired,
		photo_200: PropTypes.string.isRequired,
	}).isRequired
}

function RateButton({ imageSrc, code, sendRate }) {
	return (
		<Button
			style={{
				flex: '100%',
				position: 'relative',
				maxWidth: '64px',
				maxHeight: '64px',
				padding: 0,
				margin: 0,
				border: 0,
			}}
			mode='tertiary'
			onClick={() => {
				sendRate(code)
			}}
		>
			<img style={{
				position: 'absolute',
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,

				height: '100%',
				width: '100%',
			}} src={imageSrc} alt={code} />
		</Button>
	)
}

RateButton.propTypes = {
	imageSrc: PropTypes.string.isRequired,
	code: PropTypes.string.isRequired,
	sendRate: PropTypes.func.isRequired,
}

function RatingButtons({ userid, setSnackbar, fetchRating }) {
	const sendRate = useCallback(async (rate) => {
		try {
			await postRating(userid, rate)
		} catch (err) {
			let msg = ""
			switch (err.error_code) {
				case 98765:
					msg = "Во избежание флуда, оценивать можно 9 раз в 24 часа"
					break
				case 4321:
					msg = "Во избежание флуда, оценивать одного человека можно 2 раза в 24 часа"
					break
				default:
					console.error(err)
					msg = 'Не удалось отправить оценку'
			}

			showErrorSnackbar(setSnackbar, msg)

			return
		}

		showSuccessSnackbar(setSnackbar, 'Спасибо за вашу оценку!')
		fetchRating()
	}, [userid])

	return (
		<React.Fragment>
			<Div style={{
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'center',
				height: '64px',
				marginTop: '8px',
			}}>
				<RateButton imageSrc={HateEmoji} code='1' sendRate={sendRate} />
				<RateButton imageSrc={DislikeEmoji} code='2' sendRate={sendRate} />
				<RateButton imageSrc={NeutralEmoji} code='3' sendRate={sendRate} />
				<RateButton imageSrc={LikeEmoji} code='4' sendRate={sendRate} />
				<RateButton imageSrc={LoveEmoji} code='5' sendRate={sendRate} />
			</Div>

			<Footer style={{
				marginTop: '16px',
			}}>Оценивайте людей после каждой встречи, нажимая на эмодзи выше</Footer>
		</React.Fragment>
	)
}

RatingButtons.propTypes = {
	userid: PropTypes.number.isRequired,
	setSnackbar: PropTypes.func.isRequired,
	fetchRating: PropTypes.func.isRequired,
}

function RatingCardBar({ imageSrc, imageAlt, color, count, biggestCount }) {
	return (
		<div style={{
			height: '28px',
			display: 'flex',
		}}>
			<img style={{
				height: '28px',
				flex: '10%',
			}} src={imageSrc} alt={imageAlt} />

			<div style={{
				height: '20px',
				paddingTop: '4px',
				flex: '70%',
			}}>
				<div style={{
					height: '20px',
					width: '100%',
					backgroundColor: (document.body.attributes.getNamedItem('scheme').value == 'space_gray' ? '#232324' : '#f9f9f9'),
					borderRadius: '8px',
				}}>
					<div style={{
						height: '100%',
						width: (biggestCount > 0 ? `${count / biggestCount * 100}%` : '0px'),
						backgroundColor: color,
						borderRadius: '8px',
					}} />
				</div>
			</div>

			<Subhead
				weight="regular"
				style={{
					height: '19px',
					paddingTop: '4.5px',
					flex: '10%',
					textAlign: 'right',
				}}
			>{count}</Subhead>
		</div>
	)
}

RatingCardBar.propTypes = {
	imageSrc: PropTypes.string.isRequired,
	imageAlt: PropTypes.string.isRequired,
	color: PropTypes.string.isRequired,
	count: PropTypes.number.isRequired,
	biggestCount: PropTypes.number.isRequired,
}

// ratingCounts - array
// [4] - 5 rating count
// [3] - 4 rating count
// [2] - 3 rating count
// [1] - 2 rating count
// [0] - 1 rating count

function RatingCard({ ratingCounts }) {
	const [ratingCard, setRatingCard] = useState(null)

	useEffect(() => {
		if (ratingCounts == null) {
			return
		}

		let biggestCount = 0

		for (let i = 0; i < ratingCounts.length; i++) {
			biggestCount = Math.max(biggestCount, ratingCounts[i])
		}

		let [averageRating, averageRatingEmoji] = createAverageRating(ratingCounts)

		setRatingCard(<Div>
			<Group
				separator='hide'
				header={<Header
					mode='secondary'
					style={{
						WebkitUserSelect: 'none',
						WebkitTouchCallout: 'none',
						MozUserSelect: 'none',
						msUserSelect: 'none',
						userSelect: 'none',
					}}
				>Рейтинг</Header>}
			>
				<Card size='l'>
					<Card size='l' mode='shadow'>
						<Div>
							<RatingCardBar imageSrc={LoveEmoji} imageAlt='5' biggestCount={biggestCount} color='#FFC107' count={ratingCounts[4]} />
							<RatingCardBar imageSrc={LikeEmoji} imageAlt='4' biggestCount={biggestCount} color='#4CD964' count={ratingCounts[3]} />
							<RatingCardBar imageSrc={NeutralEmoji} imageAlt='3' biggestCount={biggestCount} color='#63B9BA' count={ratingCounts[2]} />
							<RatingCardBar imageSrc={DislikeEmoji} imageAlt='2' biggestCount={biggestCount} color='#F4E7C3' count={ratingCounts[1]} />
							<RatingCardBar imageSrc={HateEmoji} imageAlt='1' biggestCount={biggestCount} color='#E64646' count={ratingCounts[0]} />
						</Div>
					</Card>
					{averageRatingEmoji ? <img style={{
						height: '112px',
						display: 'block',
						margin: 'auto',
					}} src={averageRatingEmoji} alt={averageRating} /> : null}
				</Card>
			</Group>
		</Div>)
	}, [ratingCounts])

	return ratingCard
}

// TODO: сделать возможность поделиться числами рейтинга и возможность запостить в профиле (не только в истории)
function ShareStoryButton({ setSnackbar, user }) {
	if (!NaN) return null

	return (
		<Footer><Button mode='tertiary' onClick={async () => {
			try {
				const profileurl = `https://vk.com/app7607943#@${user.screen_name ? user.screen_name : `id${user.id}`}`

				let svgstr = vkQr.createQR(profileurl, {
					qrSize: 457,
					isShowLogo: true,
					ecc: 2,
				})

				let qrDataURI = `data:image/svg+xml;base64,${btoa(svgstr)}`

				await bridge.send('VKWebAppShowStoryBox', {
					background_type: 'image',
					// FIXME: найти более адекватный способ хранить фоновое изображение
					url: 'https://sun9-25.userapi.com/impg/1KpId_whyeGZbsskmTKy1WBQ0dEH2j0HC70YoQ/_ZtWncKGasQ.jpg?size=1080x1920&quality=96&proxy=1&sign=194a58123d9879f6f9367be1e5991a60',
					locked: true,
					attachment: {
						type: 'url',
						text: 'go_to',
						url: `https://vk.com/app7607943#@${user.screen_name ? user.screen_name : `id${user.id}`}`,
					},
					stickers: [{
						sticker_type: 'renderable',
						sticker: {
							can_delete: false,
							content_type: 'image',
							url: user.photo_200,
							transform: {
								relation_width: 0.5,
								gravity: 'center_top',
								translation_y: 0.175,
							},
							clickable_zones: [{
								action_type: 'link',
								action: {
									link: profileurl,
									tooltip_text_key: 'tooltip_open_page',
								},
							}],
						},
					}, {
						sticker_type: 'renderable',
						sticker: {
							can_delete: false,
							content_type: 'image',
							blob: qrDataURI,
							transform: {
								relation_width: 0.7,
								gravity: 'center_bottom',
								translation_y: -0.1,
							},
							clickable_zones: [{
								action_type: 'app',
								action: {
									app_id: 7607943,
									app_context: String(user.id),
								},
							}, {
								action_type: 'link',
								action: {
									link: profileurl,
									tooltip_text_key: 'tooltip_open_page',
								},
							}],
						},
					}]
				})

				showSuccessSnackbar(setSnackbar, "История успешно опубликована!")
			} catch (err) {
				if (err.error_data.error_code !== 4) {
					console.error(err)
					showErrorSnackbar(setSnackbar, 'Не удалось открыть редактор истории')
				}
			}
		}}>Поделиться в истории</Button></Footer >
	)
}

ShareStoryButton.propTypes = {
	setSnackbar: PropTypes.func.isRequired,
	user: PropTypes.shape({
		id: PropTypes.number.isRequired,
		screen_name: PropTypes.string.isRequired,
		photo_200: PropTypes.string.isRequired,
	}).isRequired,
}

function UserProfile({ setPopout, setSnackbar, currentUser, user }) {
	const [isFetching, setIsFetching] = useState(false)
	const [ratingCounts, setRatingCounts] = useState([0, 0, 0, 0, 0])
	const [ratingCard, setRatingCard] = useState(null)

	const fetchRating = useCallback(async () => {
		let prevRatingCounts = ratingCounts

		try {
			setRatingCard(<PanelSpinner />)

			let ratingCountsData = (await getRating(user.id)).rating_counts

			if (!ratingCountsData) {
				throw new Error('`ratingCountsData` is empty')
			}

			setRatingCounts(ratingCounts)
			setRatingCard(<RatingCard ratingCounts={ratingCountsData} />)
		} catch (err) {
			console.error(err)
			setRatingCard(<RatingCard ratingCounts={prevRatingCounts} />)
			showErrorSnackbar(setSnackbar, "Не удалось получить данные о рейтинге")
		}
	}, [user])

	const [promoBanner, setPromoBanner] = useState(null)

	const fetchAds = useCallback(async () => {
		try {
			let adsData = await bridge.send("VKWebAppGetAds", {})
			setPromoBanner(<PromoBanner bannerData={adsData} onClose={() => {
				setPromoBanner(null)
			}} />)
		} catch (err) {
			console.error(err)
		}
	}, [])

	useEffect(() => {
		fetchRating()
		fetchAds()
	}, [])

	return (
		<PullToRefresh
			onRefresh={async () => {
				setSnackbar(null)

				setIsFetching(true)
				fetchAds()
				await fetchRating()
				setIsFetching(false)
			}}
			isFetching={isFetching}
		>
			<UserProfileRichCell setPopout={setPopout} setSnackbar={setSnackbar} user={user} />

			{currentUser.id !== user.id && user.deactivated != 'deleted' ? <RatingButtons userid={user.id} setSnackbar={setSnackbar} fetchRating={fetchRating} /> : null}

			{promoBanner}

			{ratingCard}

			{<ShareStoryButton setSnackbar={setSnackbar} user={user} ratingCounts={ratingCounts} />}
		</PullToRefresh>
	)
}

UserProfile.propTypes = {
	setPopout: PropTypes.func.isRequired,
	setSnackbar: PropTypes.func.isRequired,
	currentUser: PropTypes.shape({
		id: PropTypes.number.isRequired,
	}).isRequired,
	user: PropTypes.shape({
		id: PropTypes.number.isRequired,
		screen_name: PropTypes.string.isRequired,
		first_name: PropTypes.string.isRequired,
		last_name: PropTypes.string.isRequired,
		photo_200: PropTypes.string.isRequired,
		deactivated: PropTypes.string,
	}).isRequired,
}

export default Profile
