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

// TODO: рекламный блок в версии vk.com и m.vk.com

function Profile({ id, go, setPopout, executeReCaptcha, currentUser, user }) {
	const [snackbar, setSnackbar] = useState(null)

	useEffect(() => {
		if (user == null) {
			return
		}

		const setLocation = async () => {
			try {
				await bridge.send('VKWebAppSetLocation', { location: `@${user.screen_name ? user.screen_name : `id${user.id}`}` })
			} catch (err) {
				console.error(err)
			}
		}
		setLocation()

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
			<PanelHeader left={<PanelHeaderBack onClick={() => { go('home') }} />}><PanelHeaderContent>{user == null ? `Загрузка профиля` : `@${user.screen_name ? user.screen_name : `id${user.id}`}`}</PanelHeaderContent></PanelHeader>

			{user ? <UserProfile setPopout={setPopout} setSnackbar={setSnackbar} executeReCaptcha={executeReCaptcha} currentUser={currentUser} user={user} /> : null}

			{snackbar}
		</Panel>
	)
}

Profile.propTypes = {
	id: PropTypes.string,
	go: PropTypes.func,
	setPopout: PropTypes.func,
	executeReCaptcha: PropTypes.func,
	currentUser: PropTypes.shape({
		id: PropTypes.number,
	}),
	user: PropTypes.shape({
		id: PropTypes.number,
		screen_name: PropTypes.string,
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		photo_200: PropTypes.string,
	})
}

function UserProfileRichCell({ setPopout, setSnackbar, user }) {
	return (
		<RichCell
			disabled
			before={<Avatar size={80} src={user.photo_200} />}
			actions={
				<div style={{ display: 'flex' }}>
					<Button mode='tertiary' stretched
						href={`https://vk.com/${user.screen_name ? user.screen_name : `id${user.id}`}`}
						target='_blank'
					><Icon24Link /></Button>
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
						const targetstr = `https://vk.com/app7607943#@${user.screen_name ? user.screen_name : `id${user.id}`}`

						let svgstr = vkQr.createQR(targetstr, {
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
											await bridge.send("VKWebAppCopyText", { "text": targetstr })
										} catch (err) {
											if (err.error_data.error_code !== 4) {
												console.error(err)
												showErrorSnackbar(setSnackbar, 'Не удалось скопировать ссылку')
												return
											}
										}
										showSuccessSnackbar(setSnackbar, 'Ссылка скопирована!')
									}
								}, {
									title: 'Отмена',
									autoclose: true,
									mode: 'cancel'
								}]}
								onClose={() => { setPopout(null) }}
							>
								<img
									id={`qr_code_${user.id}`}
									alt={targetstr}
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
			<Title level="2" weight="regular">{`${user.first_name} ${user.last_name}`}</Title>
		</RichCell>
	)
}

UserProfileRichCell.propTypes = {
	setPopout: PropTypes.func,
	setSnackbar: PropTypes.func,
	user: PropTypes.shape({
		id: PropTypes.number,
		screen_name: PropTypes.string,
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		photo_200: PropTypes.string,
	})
}

function RateButton({ imageSrc, code, chooseRate }) {
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
				chooseRate(code)
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
	imageSrc: PropTypes.string,
	code: PropTypes.string,
	chooseRate: PropTypes.func,
}

function RatingButtons({ userid, setSnackbar, executeReCaptcha, fetchRating }) {
	const chooseRate = useCallback((rate) => {
		executeReCaptcha(async (token, error) => {
			if (token) {
				try {
					await postRating(userid, rate, token)
				} catch (err) {
					if (err.code === 98765) {
						showErrorSnackbar(setSnackbar, "Во избежания флуда, оценивать можно 9 раз за 24 часа")
					} else {
						console.error(err)
						showErrorSnackbar(setSnackbar, 'Не удалось отправить оценку')
					}
					return
				}

				showSuccessSnackbar(setSnackbar, 'Спасибо за вашу оценку!')
				fetchRating()
			} else if (error) {
				console.error(error)
				showErrorSnackbar(setSnackbar, 'Не выполнить проверку ReCAPTCHA')
			}
		})
	}, [executeReCaptcha, userid, setSnackbar, fetchRating])

	return (
		<React.Fragment>
			<Div style={{
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'center',
				height: '64px',
				marginTop: '8px',
			}}>
				<RateButton imageSrc={HateEmoji} code='1' chooseRate={chooseRate} />
				<RateButton imageSrc={DislikeEmoji} code='2' chooseRate={chooseRate} />
				<RateButton imageSrc={NeutralEmoji} code='3' chooseRate={chooseRate} />
				<RateButton imageSrc={LikeEmoji} code='4' chooseRate={chooseRate} />
				<RateButton imageSrc={LoveEmoji} code='5' chooseRate={chooseRate} />
			</Div>

			<Footer style={{
				marginTop: '16px',
			}}>Оценивайте людей после каждой встречи нажимая на эмодзи выше</Footer>
		</React.Fragment>
	)
}

RatingButtons.propTypes = {
	userid: PropTypes.number,
	setSnackbar: PropTypes.func,
	executeReCaptcha: PropTypes.func,
	fetchRating: PropTypes.func,
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
	imageSrc: PropTypes.string,
	imageAlt: PropTypes.string,
	color: PropTypes.string,
	count: PropTypes.number,
	biggestCount: PropTypes.number,
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
				header={<Header mode='secondary'>Рейтинг</Header>}
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

function UserProfile({ setPopout, setSnackbar, executeReCaptcha, currentUser, user }) {
	const [isFetching, setIsFetching] = useState(false)
	const [ratingCounts, setRatingCounts] = useState(null)

	const fetchRating = useCallback(async () => {
		let prevRatingCounts = ratingCounts

		setRatingCounts(null)

		let ratingCountsData = null
		try {
			ratingCountsData = (await getRating(user.id)).rating_counts
		} catch (err) {
			console.error(err)
		}

		if (!ratingCountsData) {
			setRatingCounts(prevRatingCounts)
			showErrorSnackbar(setSnackbar, "Не удалось получить данные о рейтинге")
			return
		}

		setRatingCounts(ratingCountsData)
	}, [setSnackbar, user])

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
	}, [fetchRating])

	return (
		<PullToRefresh
			onRefresh={async () => {
				setIsFetching(true)
				fetchAds()
				await fetchRating()
				setIsFetching(false)
			}}
			isFetching={isFetching}
		>
			<UserProfileRichCell setPopout={setPopout} setSnackbar={setSnackbar} user={user} />

			{currentUser.id !== user.id ? <RatingButtons userid={user.id} setSnackbar={setSnackbar} executeReCaptcha={executeReCaptcha} fetchRating={fetchRating} /> : null}

			{promoBanner}

			{ratingCounts != null ? <RatingCard ratingCounts={ratingCounts} /> : <PanelSpinner />}
		</PullToRefresh>
	)
}

UserProfile.propTypes = {
	setPopout: PropTypes.func,
	setSnackbar: PropTypes.func,
	executeReCaptcha: PropTypes.func,
	currentUser: PropTypes.shape({
		id: PropTypes.number,
	}),
	user: PropTypes.shape({
		id: PropTypes.number,
		screen_name: PropTypes.string,
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		photo_200: PropTypes.string,
	}),
}

export default Profile
