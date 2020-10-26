import React, {
    useState,
} from 'react'

import {
    Panel,
    Gallery,
    Div,
    Button,
    Placeholder,
} from '@vkontakte/vkui/'

import {
    Icon56FavoriteOutline,
    Icon56LikeOutline,
    Icon56UsersOutline,
} from '@vkontakte/icons'

function Slideshow({ id, doneCallback }) {
    const [slideIndex, setSlideIndex] = useState(0)

    return (
        <Panel id={id}>
            <Div
                style={{
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    position: 'fixed',
                }}
            >
                <Gallery
                    slideWidth='100%'
                    bullets="dark"
                    slideIndex={slideIndex}
                    onChange={(i) => { setSlideIndex(i) }}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <Placeholder
                        icon={<Icon56FavoriteOutline />}
                        header="Добро пожаловать!"
                        action={<Button size="xl" mode="tertiary" onClick={() => { setSlideIndex(1) }}>Ух ты!</Button>}
                    >Sociorate - уникальное приложение человеческого рейтинга.</Placeholder>
                    <Placeholder
                        icon={<Icon56LikeOutline />}
                        header="Оценивайте людей"
                        action={<Button size="xl" mode="tertiary" onClick={() => { setSlideIndex(2) }}>Интересно!</Button>}
                    >После каждой встречи</Placeholder>
                    <Placeholder
                        icon={<Icon56UsersOutline />}
                        header="Узнавайте рейтинг любого человека"
                        action={<Button size="xl" mode="tertiary" onClick={() => { doneCallback() }}>Начать!</Button>}
                    >И следите за своим ;)</Placeholder>
                </Gallery>
            </Div>
        </Panel>
    )
}

export default Slideshow
