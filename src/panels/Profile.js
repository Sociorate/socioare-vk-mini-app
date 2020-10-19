import React, {
	useEffect,
	useState,
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
	Text,
	PanelHeaderBack,
	PanelHeaderContent,
	PanelSpinner,
	Alert,
	Title,
} from '@vkontakte/vkui'

import {
	Icon24ShareOutline,
	Icon24Qr,
	Icon24Link,
} from '@vkontakte/icons'

import bridge from '@vkontakte/vk-bridge'

import vkQr from '@vkontakte/vk-qr'

import {
	showErrorSnackbar,
	showSuccessSnackbar,
} from './_showSnackbar'

import LoveEmoji from 'openmoji/color/svg/1F929.svg'
import LikeEmoji from 'openmoji/color/svg/1F60A.svg'
import NeutralEmoji from 'openmoji/color/svg/1F610.svg'
import DislikeEmoji from 'openmoji/color/svg/1F627.svg'
import HateEmoji from 'openmoji/color/svg/1F621.svg'

// TODO: рекламный баннер внизу экрана профиля
// TODO: писать спасибо после оценивания (и зелёная галочка)
// TODO: скачивание qr кода

function Profile({ id, go, setPopout, reCaptchaRef, currentUserID, userid }) {
	const [snackbar, setSnackbar] = useState(null)
	const [user, setUser] = useState(null)
	const [profileView, setProfileView] = useState(null)

	useEffect(() => {
		if (userid == null) {
			return
		}

		const fetchUser = async () => {
			let accessData = null

			try {
				accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: '' })
			} catch (err) {
				if (err.error_data.error_code !== 4) {
					console.error(err)
					showErrorSnackbar(setSnackbar, 'Не удалось получить разрешение')
					return
				}
			}

			if (accessData == null) {
				showErrorSnackbar(setSnackbar, 'Для работы этой функции необходимо предоставить разрешение.')
				return
			}

			let users = null

			try {
				setProfileView(<PanelSpinner />)
				users = (await bridge.send('VKWebAppCallAPIMethod', { method: 'users.get', params: { user_ids: userid, fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response
			} catch (err) {
				if (err.error_data.error_code === 1) {
					showErrorSnackbar(setSnackbar, 'Пользователь с таким ID не существует')
				} else {
					console.error(err)
					showErrorSnackbar(setSnackbar, 'Не удалось получить профиль')
				}
			} finally {
				setProfileView(null)
			}

			if (users == null) {
				return
			}
			if (users.length === 0) {
				showErrorSnackbar(setSnackbar, 'Пользователь с таким ID не существует')
				return
			}

			setUser(users[0])
			setProfileView(<UserProfile setPopout={setPopout} setSnackbar={setSnackbar} reCaptchaRef={reCaptchaRef} currentUserID={currentUserID} user={users[0]} />)

			try {
				await bridge.send('VKWebAppSetLocation', { location: `@${users[0].screen_name}` })
			} catch (err) {
				if (err !== null) {
					console.error(err)
				}
			}
		}
		fetchUser()
	}, [setPopout, currentUserID, reCaptchaRef, userid])

	useEffect(() => {
		if (user == null) {
			return
		}

		const saveLastViewed = async () => {
			let data = ''

			try {
				data = (await bridge.send('VKWebAppStorageGet', { keys: ['last_viewed_profiles'] })).keys[0].value
			} catch (err) {
				console.error(err)
				return
			}

			let fetchedUsers = data.split(',')

			const index = fetchedUsers.indexOf(String(user.id))
			if (index !== -1) {
				fetchedUsers.splice(index, 1)
			}

			fetchedUsers.unshift(String(user.id))

			for (let i = fetchedUsers.length; i > 9; i--) {
				fetchedUsers.pop()
			}

			try {
				await bridge.send('VKWebAppStorageSet', { key: 'last_viewed_profiles', value: fetchedUsers.join(',') })
			} catch (err) {
				console.error(err)
			}
		}
		saveLastViewed()
	}, [user])

	return (
		<Panel id={id}>
			<PanelHeader left={<PanelHeaderBack onClick={() => { go('home') }} />}><PanelHeaderContent>{user != null ? `@${user.screen_name}` : (userid != null ? `@${userid}` : 'Профиль')}</PanelHeaderContent></PanelHeader>

			{profileView}

			{snackbar}
		</Panel>
	)
}

function RateButton({ imageSrc, code, userid, setSnackbar, reCaptchaRef }) {
	return (
		<Button
			style={{
				position: 'relative',
				width: '63px',
			}}
			mode='tertiary'
			onClick={async () => {
				let reCaptchaToken = null
				try {
					reCaptchaToken = await reCaptchaRef.current.executeAsync()
					reCaptchaRef.current.reset()
				} catch (err) {
					console.error(err)
					showErrorSnackbar(setSnackbar, 'Не удалось отправить оценку')
				}

				console.log(userid, code, reCaptchaToken)
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

function RatingButtons({ userid, setSnackbar, reCaptchaRef }) {
	return (
		<React.Fragment>
			<Div style={{
				display: 'flex',
				justifyContent: 'center',
				height: '63px',
				marginTop: '10px'
			}}>
				{/* TODO: Снэкбар "Спасибо за ваше !" */}
				{/* TODO: Снэкбар с серой кнопкой отменить после нажатия */}
				<RateButton imageSrc={HateEmoji} code='1' userid={userid} setSnackbar={setSnackbar} reCaptchaRef={reCaptchaRef} />
				<RateButton imageSrc={DislikeEmoji} code='2' userid={userid} setSnackbar={setSnackbar} reCaptchaRef={reCaptchaRef} />
				<RateButton imageSrc={NeutralEmoji} code='3' userid={userid} setSnackbar={setSnackbar} reCaptchaRef={reCaptchaRef} />
				<RateButton imageSrc={LikeEmoji} code='4' userid={userid} setSnackbar={setSnackbar} reCaptchaRef={reCaptchaRef} />
				<RateButton imageSrc={LoveEmoji} code='5' userid={userid} setSnackbar={setSnackbar} reCaptchaRef={reCaptchaRef} />
			</Div>

			<Footer style={{ marginTop: '12px' }}>Оценивайте людей после каждой встречи нажимая на эмодзи выше</Footer>
		</React.Fragment>
	)
}

function RatingCardBar({ emoji, emojiAlt, level, color, count }) {
	return (
		<div style={{
			height: '27px',
			display: 'flex',
		}}>
			<img style={{
				height: '27px',
				flex: '10%',
			}} src={emoji} alt={emojiAlt} />

			<div style={{
				height: '18px',
				paddingTop: '4.5px',
				flex: '70%',
			}}>
				<div style={{
					height: '18px',
					width: '100%',
					backgroundColor: '#f1f1f1',
					color: 'white',
				}}>
					<div style={{
						height: '100%',
						width: level + '%',
						backgroundColor: color,
					}} />
				</div>
			</div>

			<Text style={{
				height: '18px',
				paddingTop: '4.5px',
				flex: '10%',
				textAlign: 'right',
			}}>{count}</Text>
		</div>
	)
}

// rating - array
// [4] - 5
// [3] - 4
// [2] - 3
// [1] - 2
// [0] - 1
const RatingCard = ({ rating }) => {
	let biggestCount = 0
	let allCount = 0

	for (var i = 0; i < rating.length; i++) {
		allCount += rating[i]
		biggestCount = Math.max(biggestCount, rating[i]);
	}

	let averageRatingEmoji = null
	let averageRating = 0

	if (allCount >= 3) {
		let averageRating = (5 * rating[4] + 4 * rating[3] + 3 * rating[2] + 2 * rating[1] + rating[0]) / allCount

		// Hate:    1.0 - 1.8
		// Dislike: 1.8 - 2.6
		// Neutral: 2.6 - 3.4
		// Like:    3.4 - 4.2
		// Love:    4.2 - 5.0

		if (averageRating > 1.0 && averageRating < 1.8) {
			averageRatingEmoji = HateEmoji
		} else if (averageRating > 1.8 && averageRating < 2.6) {
			averageRatingEmoji = DislikeEmoji
		} else if (averageRating > 2.6 && averageRating < 3.4) {
			averageRatingEmoji = NeutralEmoji
		} else if (averageRating > 3.4 && averageRating < 4.2) {
			averageRatingEmoji = LikeEmoji
		} else if (averageRating > 4.2 && averageRating < 5.0) {
			averageRatingEmoji = LoveEmoji
		}
	}

	return (
		<Div>
			<Group
				separator='hide'
				header={<Header mode='secondary'>Рейтинг за последние 7 дней</Header>}
			>
				<Card size='l'>
					<Card size='l' mode='shadow'>
						<Div>
							<RatingCardBar emoji={LoveEmoji} emojiAlt='5' level={rating[4] / biggestCount * 100} color='#4CAF50' count={rating[4]} />
							<RatingCardBar emoji={LikeEmoji} emojiAlt='4' level={rating[3] / biggestCount * 100} color='#2196F3' count={rating[3]} />
							<RatingCardBar emoji={NeutralEmoji} emojiAlt='3' level={rating[2] / biggestCount * 100} color='#00bcd4' count={rating[2]} />
							<RatingCardBar emoji={DislikeEmoji} emojiAlt='2' level={rating[1] / biggestCount * 100} color='#ff9800' count={rating[1]} />
							<RatingCardBar emoji={HateEmoji} emojiAlt='1' level={rating[0] / biggestCount * 100} color='#f44336' count={rating[0]} />
						</Div>
					</Card>
					{averageRatingEmoji ? <img style={{
						height: '108px',
						display: 'block',
						margin: 'auto',
					}} src={averageRatingEmoji} alt={averageRating} /> : null}
				</Card>
			</Group>
		</Div>
	)
}

function UserProfile({ setPopout, setSnackbar, reCaptchaRef, currentUserID, user }) {
	return (
		<React.Fragment>
			<RichCell
				disabled
				before={<Avatar size={81} src={user.photo_200} />}
				actions={
					<div style={{ display: 'flex' }}>
						<Button mode='tertiary' stretched
							href={`https://vk.com/${user.screen_name}`}
							target='_blank'
						><Icon24Link /></Button>
						<Button mode='tertiary' stretched onClick={async () => {
							try {
								await bridge.send('VKWebAppShare', { link: `https://vk.com/app7607943#@${user.screen_name}` });
							} catch (err) {
								if (err.error_data.error_code !== 4) {
									console.error(err)
									showErrorSnackbar(setSnackbar, 'Не удалось открыть диалог Share')
									return
								}
							}
						}}><Icon24ShareOutline /></Button>
						<Button mode='tertiary' stretched onClick={() => {
							const targetstr = `https://vk.com/app7607943#@${user.screen_name}`

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
											showSuccessSnackbar(setSnackbar, 'Ссылка скопирована')
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
				<Title level="3" weight="regular">{user.first_name + ' ' + user.last_name}</Title>
			</RichCell>

			{currentUserID !== user.id ? <RatingButtons userid={user.id} setSnackbar={setSnackbar} reCaptchaRef={reCaptchaRef} /> : null}

			<RatingCard rating={[1, 2, 4, 9, 15]} />

			<Footer>Все эмодзи сделаны <Link href='https://openmoji.org/' target='_blank'>OpenMoji</Link> – проект свободных эмодзи и иконок. Лицензия: <Link href='https://creativecommons.org/licenses/by-sa/4.0/#' target='_blank'>CC BY-SA 4.0</Link></Footer>
		</React.Fragment>
	)
}

export default Profile

// (средний_рейтинг * количество_оценивших + новая_оценка) / (количество_оценивших + 1) = новый_средний_рейтинг
// (средний_рейтинг_за_день_A * количество_оценивших_в_день_A + средний_рейтинг_за_день_B * количество_оценивших_в_день_B) / (количество_оценивших_в_день_A + количество_оценивших_в_день_B) = средний_рейтинг_за_дни_A_и_B
