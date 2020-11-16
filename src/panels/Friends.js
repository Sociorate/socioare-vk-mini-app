import React, {
    useEffect,
    useState,
} from 'react'

import PropTypes from 'prop-types'

import {
    Panel,
    PanelHeader,
    PanelHeaderClose,
    Placeholder,
    PanelSpinner,
    Search,
    PanelHeaderContent,
    Button,
} from '@vkontakte/vkui'

import {
    Icon56CheckCircleDeviceOutline,
} from '@vkontakte/icons'

import {
    showErrorSnackbar,
} from './_showSnackbar'

import {
    vkUsersGet,
} from './sociorate-api'

import UsersList from './_UsersList'

import bridge from '@vkontakte/vk-bridge'

function Friends({ id, setActivePanel, setPanelProfileUser }) {
    const [snackbar, setSnackbar] = useState(null)
    const [friendsView, setFriendsView] = useState(null)

    useEffect(() => {
        const fetchFriends = async () => {
            let friend = null
            let isErrNotSupportedPlatform = false

            try {
                friend = (await bridge.send('VKWebAppGetFriends', { multi: false })).users[0]
            } catch (err) {
                switch (err.error_data.error_code) {
                    case 4:
                        setActivePanel('home')
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
                setActivePanel('home')
                return
            }

            if (friend != null) {
                let fetchedFriend = null
                try {
                    fetchedFriend = (await vkUsersGet(friend.id))[0]
                } catch (err) {
                    console.error(err)
                }

                setPanelProfileUser(fetchedFriend ? fetchedFriend : friend)
                setActivePanel('profile')

                return
            }

            let accessData = null

            try {
                accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: 'friends' })
            } catch (err) {
                if (err.error_data.error_code !== 4) {
                    console.error(err)
                    showErrorSnackbar(setSnackbar, 'Не удалось получить список друзей')
                    return
                }
            }

            if (accessData == null || accessData.scope.indexOf('friends') === -1) {
                setFriendsView(
                    <Placeholder
                        stretched
                        icon={<Icon56CheckCircleDeviceOutline />}
                        action={<Button onClick={() => {
                            fetchFriends()
                        }} size='l'>Хорошо</Button>}
                    >Для работы этой функции необходимо предоставить доступ к списку друзей.</Placeholder>
                )
                return
            }

            let friends = null

            setFriendsView(<PanelSpinner />)

            try {
                friends = (await bridge.send('VKWebAppCallAPIMethod', { method: 'friends.get', params: { order: 'name', fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response.items
            } catch (err) {
                console.error(err)
                showErrorSnackbar(setSnackbar, 'Не удалось получить список друзей')
                return
            }

            if (friends !== null) {
                setFriendsView(
                    <FriendsDisplay
                        setActivePanel={setActivePanel}
                        setPanelProfileUser={setPanelProfileUser}
                        setSnackbar={setSnackbar}
                        accessToken={accessData.access_token}
                        friends={friends}
                    />
                )
            }
        }
        fetchFriends()
    }, [])

    return (
        <Panel id={id}>
            <PanelHeader
                left={<PanelHeaderClose onClick={() => { setActivePanel('home') }} />}
                separator={false}
            >
                <PanelHeaderContent>Друзья</PanelHeaderContent>
            </PanelHeader>

            {friendsView}

            {snackbar}
        </Panel>
    )
}

Friends.propTypes = {
    id: PropTypes.string.isRequired,
    setActivePanel: PropTypes.func.isRequired,
    setPanelProfileUser: PropTypes.func.isRequired,
}

function FriendsDisplay({ setActivePanel, setPanelProfileUser, setSnackbar, accessToken, friends }) {
    let origFriendsCells = <UsersList setActivePanel={setActivePanel} setPanelProfileUser={setPanelProfileUser} users={friends} />

    const [friendsCells, setFriendsCells] = useState(origFriendsCells)

    return (
        <React.Fragment>
            <Search onChange={async function (event) {
                let userInput = event.target.value

                if (userInput === '') {
                    setFriendsCells(origFriendsCells)
                    return
                }

                let friendsSearch = null

                setFriendsCells(<PanelSpinner />)
                try {
                    friendsSearch = (await bridge.send('VKWebAppCallAPIMethod', { method: 'friends.search', params: { q: userInput, fields: 'photo_200,screen_name', v: '5.124', access_token: accessToken } })).response.items
                } catch (err) {
                    if (err.error_data.error_code !== 1) {
                        console.error(err)
                        showErrorSnackbar(setSnackbar, 'Не удалось выполнить поиск по друзьям')
                    }
                }

                if (friendsSearch == null) {
                    setFriendsCells(origFriendsCells)
                    return
                }

                if (friendsSearch.length === 0) {
                    setFriendsCells(<Placeholder>По вашему запросу не найдено ни одного друга</Placeholder>)
                    return
                }

                setFriendsCells(<UsersList setActivePanel={setActivePanel} setPanelProfileUser={setPanelProfileUser} users={friendsSearch} />)
            }} after={null} />

            {friendsCells}
        </React.Fragment>
    )
}

FriendsDisplay.propTypes = {
    setActivePanel: PropTypes.func.isRequired,
    setPanelProfileUser: PropTypes.func.isRequired,
    setSnackbar: PropTypes.func.isRequired,
    accessToken: PropTypes.string.isRequired,
    friends: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        screen_name: PropTypes.string.isRequired,
        first_name: PropTypes.string.isRequired,
        last_name: PropTypes.string.isRequired,
        photo_200: PropTypes.string.isRequired,
    })).isRequired
}

export default Friends
