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

import UsersList from './_UsersList'

import bridge from '@vkontakte/vk-bridge'

function Friends({ id, go, goBack }) {
    const [snackbar, setSnackbar] = useState(null)
    const [friendsView, setFriendsView] = useState(null)

    useEffect(() => {
        const openFriendsView = async () => {
            try {
                let accessData = null

                try {
                    accessData = await bridge.send('VKWebAppGetAuthToken', { app_id: 7607943, scope: 'friends' })
                } catch (err) {
                    if (err.error_data.error_code === 4) {
                        return
                    } else {
                        throw err
                    }
                }

                if (accessData == null || accessData.scope.indexOf('friends') === -1) {
                    setFriendsView(
                        <Placeholder
                            stretched
                            icon={<Icon56CheckCircleDeviceOutline />}
                            action={<Button onClick={() => {
                                openFriendsView()
                            }} size='l'>Хорошо</Button>}
                        >Для работы этой функции необходимо предоставить доступ к списку друзей.</Placeholder>
                    )
                    return
                }

                setFriendsView(<PanelSpinner />)

                let friends = (await bridge.send('VKWebAppCallAPIMethod', { method: 'friends.get', params: { order: 'name', fields: 'photo_200,screen_name', v: '5.124', access_token: accessData.access_token } })).response.items

                if (friends !== null) {
                    setFriendsView(
                        <FriendsDisplay
                            go={go}
                            setSnackbar={setSnackbar}
                            accessToken={accessData.access_token}
                            friends={friends}
                        />
                    )
                }
            } catch (err) {
                console.error(err)
                showErrorSnackbar(setSnackbar, 'Не удалось получить список друзей')
            }
        }
        openFriendsView()
    }, [])

    return (
        <Panel id={id}>
            <PanelHeader
                left={<PanelHeaderClose onClick={() => { goBack() }} />}
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
    go: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
}

function FriendsDisplay({ go, setSnackbar, accessToken, friends }) {
    let origFriendsCells = <UsersList go={go} users={friends} />

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

                setFriendsCells(<UsersList go={go} users={friendsSearch} />)
            }} after={null} />

            {friendsCells}
        </React.Fragment>
    )
}

FriendsDisplay.propTypes = {
    go: PropTypes.func.isRequired,
    setSnackbar: PropTypes.func.isRequired,
    accessToken: PropTypes.string.isRequired,
    friends: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        screen_name: PropTypes.string.isRequired,
        first_name: PropTypes.string.isRequired,
        last_name: PropTypes.string.isRequired,
        photo_200: PropTypes.string.isRequired,
        deactivated: PropTypes.string,
    })).isRequired
}

export default Friends
