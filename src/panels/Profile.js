import React, {
	useEffect,
	useState,
	useCallback,
} from 'react'

import {
	Panel,
	PanelHeader,
	Header,
	Button,
	Group,
	RichCell,
	Div,
	Avatar,
	Link,
	Footer,
	Card,
	Subhead,
	PanelHeaderBack,
	PanelHeaderContent,
	PanelSpinner,
	Alert,
	Title,
	PullToRefresh,
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

import LoveEmoji from 'openmoji/color/svg/1F929.svg'
import LikeEmoji from 'openmoji/color/svg/1F60A.svg'
import NeutralEmoji from 'openmoji/color/svg/1F610.svg'
import DislikeEmoji from 'openmoji/color/svg/1F627.svg'
import HateEmoji from 'openmoji/color/svg/1F621.svg'

// TODO: рекламный баннер внизу экрана профиля
// TODO: просмотр статистики за последние 7 дней

function Profile({ id, go, setPopout, executeReCaptcha, currentUserID, user }) {
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
				let data = (await bridge.send('VKWebAppStorageGet', { keys: ['last_viewed_profiles'] })).keys[0].value
				let fetchedUsers = data.split(',')

				const index = fetchedUsers.indexOf(String(user.id))
				if (index !== -1) {
					fetchedUsers.splice(index, 1)
				}

				fetchedUsers.unshift(String(user.id))

				for (let i = fetchedUsers.length; i > 9; i--) {
					fetchedUsers.pop()
				}

				await bridge.send('VKWebAppStorageSet', { key: 'last_viewed_profiles', value: fetchedUsers.join(',') })
			} catch (err) {
				console.error(err)
			}
		}
		saveLastViewed()
	}, [user])

	return (
		<Panel id={id}>
			<PanelHeader left={<PanelHeaderBack onClick={() => { go('home') }} />}><PanelHeaderContent>{user == null ? `Загрузка профиля` : `@${user.screen_name ? user.screen_name : `id${user.id}`}`}</PanelHeaderContent></PanelHeader>

			{user ? <UserProfile setPopout={setPopout} setSnackbar={setSnackbar} executeReCaptcha={executeReCaptcha} currentUserID={currentUserID} user={user} /> : null}

			{snackbar}
		</Panel>
	)
}

function RateButton({ imageSrc, code, chooseRate }) {
	return (
		<Button
			style={{
				position: 'relative',
				width: '63px',
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

function RatingButtons({ userid, setSnackbar, executeReCaptcha, fetchRating }) {
	const chooseRate = useCallback((rate) => {
		executeReCaptcha(async (token, error) => {
			if (token) {
				try {
					await postRating(userid, rate, token)
				} catch (err) {
					if (err.code === 98765) {
						showErrorSnackbar(setSnackbar, "Во избежания флуда, оценивать можно раз в минуту")
					} else {
						console.error(err)
						showErrorSnackbar(setSnackbar, 'Не удалось отправить оценку')
					}
					return
				}

				showSuccessSnackbar(setSnackbar, 'Спасибо за вашу оценку!')
				fetchRating()
			} else if (error) {
				console.log(error)
				showErrorSnackbar(setSnackbar, 'Не выполнить проверку ReCAPTCHA')
			}
		})
	}, [executeReCaptcha, userid, setSnackbar, fetchRating])

	return (
		<React.Fragment>
			<Div style={{
				display: 'flex',
				justifyContent: 'center',
				height: '63px',
				marginTop: '10px'
			}}>
				<RateButton imageSrc={HateEmoji} code='1' chooseRate={chooseRate} />
				<RateButton imageSrc={DislikeEmoji} code='2' chooseRate={chooseRate} />
				<RateButton imageSrc={NeutralEmoji} code='3' chooseRate={chooseRate} />
				<RateButton imageSrc={LikeEmoji} code='4' chooseRate={chooseRate} />
				<RateButton imageSrc={LoveEmoji} code='5' chooseRate={chooseRate} />
			</Div>

			<Footer style={{ marginTop: '12px' }}>Оценивайте людей после каждой встречи нажимая на эмодзи выше</Footer>
		</React.Fragment>
	)
}

function RatingCardBar({ imageSrc, imageAlt, biggestCount, color, count }) {
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
				}}>
					<div style={{
						height: '100%',
						width: (biggestCount > 0 ? `${count / biggestCount * 100}%` : '0px'),
						backgroundColor: color,
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

// rating - array
// [4] - 5
// [3] - 4
// [2] - 3
// [1] - 2
// [0] - 1
function RatingCard({ rating }) {
	const [ratingCard, setRatingCard] = useState(null)
	useEffect(() => {
		if (rating == null) {
			return
		}

		let ratingSum = [0, 0, 0, 0, 0]

		for (let i = 0; i < rating.length; i++) {
			for (let k = 0; k < 5; k++) {
				ratingSum[k] += rating[i][k]
			}
		}

		let biggestCount = 0
		let allCount = 0

		for (let i = 0; i < ratingSum.length; i++) {
			allCount += ratingSum[i]
			biggestCount = Math.max(biggestCount, ratingSum[i]);
		}

		let [averageRating, averageRatingEmoji] = createAverageRating(ratingSum, allCount)

		setRatingCard(<Div>
			<Group
				separator='hide'
				header={<Header mode='secondary'>Рейтинг за последние 7 дней</Header>}
			>
				<Card size='l'>
					<Card size='l' mode='shadow'>
						<Div>
							<RatingCardBar imageSrc={LoveEmoji} imageAlt='5' biggestCount={biggestCount} color='#FFC107' count={ratingSum[4]} />
							<RatingCardBar imageSrc={LikeEmoji} imageAlt='4' biggestCount={biggestCount} color='#4CD964' count={ratingSum[3]} />
							<RatingCardBar imageSrc={NeutralEmoji} imageAlt='3' biggestCount={biggestCount} color='#63B9BA' count={ratingSum[2]} />
							<RatingCardBar imageSrc={DislikeEmoji} imageAlt='2' biggestCount={biggestCount} color='#F4E7C3' count={ratingSum[1]} />
							<RatingCardBar imageSrc={HateEmoji} imageAlt='1' biggestCount={biggestCount} color='#E64646' count={ratingSum[0]} />
						</Div>
					</Card>
					{averageRatingEmoji ? <img style={{
						height: '108px',
						display: 'block',
						margin: 'auto',
					}} src={averageRatingEmoji} alt={averageRating} /> : null}
				</Card>
			</Group>
		</Div>)
	}, [rating])

	return ratingCard
}

function UserProfile({ setPopout, setSnackbar, executeReCaptcha, currentUserID, user }) {
	const [isFetching, setIsFetching] = useState(false)
	const [rating, setRating] = useState(null)

	const fetchRating = useCallback(async () => {
		let data = null
		try {
			data = await getRating(user.id)
		} catch (err) {
			console.error(err)
		}

		if (data == null || !data.rating || data.rating.length !== 7) {
			showErrorSnackbar(setSnackbar, "Не удалось получить данные о рейтинге")
			return
		}

		setRating(data.rating)
	}, [setSnackbar, user])

	useEffect(() => {
		fetchRating()
	}, [fetchRating])

	return (
		<PullToRefresh
			onRefresh={async () => {
				setIsFetching(true)
				await fetchRating()
				setIsFetching(false)
			}}
			isFetching={isFetching}
		>
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
								await bridge.send('VKWebAppShare', { link: `https://vk.com/app7607943#@${user.screen_name ? user.screen_name : `id${user.id}`}` });
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
												await bridge.send("VKWebAppCopyText", { "text": targetstr });
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
										style={{ width: '100%' }}
										alt={targetstr}
										src={svgdataurl}
									/>
								</Alert>
							)
						}}><Icon24Qr /></Button>
					</div>
				}
			>
				<Title level="2" weight="regular">{`${user.first_name} ${user.last_name}`}</Title>
			</RichCell>

			{currentUserID !== user.id ? <RatingButtons userid={user.id} setSnackbar={setSnackbar} executeReCaptcha={executeReCaptcha} fetchRating={fetchRating} /> : null}

			{rating != null ? <RatingCard rating={rating} /> : <PanelSpinner />}

			<Footer>Все эмодзи сделаны <Link href='https://openmoji.org/' target='_blank'>OpenMoji</Link> – проект свободных эмодзи и иконок. Лицензия: <Link href='https://creativecommons.org/licenses/by-sa/4.0/#' target='_blank'>CC BY-SA 4.0</Link></Footer>
		</PullToRefresh>
	)
}

export default Profile

// (средний_рейтинг * количество_оценивших + новая_оценка) / (количество_оценивших + 1) = новый_средний_рейтинг
// (средний_рейтинг_за_день_A * количество_оценивших_в_день_A + средний_рейтинг_за_день_B * количество_оценивших_в_день_B) / (количество_оценивших_в_день_A + количество_оценивших_в_день_B) = средний_рейтинг_за_дни_A_и_B
