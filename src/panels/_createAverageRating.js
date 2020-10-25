import LoveEmoji from 'openmoji/color/svg/1F929.svg'
import LikeEmoji from 'openmoji/color/svg/1F60A.svg'
import NeutralEmoji from 'openmoji/color/svg/1F610.svg'
import DislikeEmoji from 'openmoji/color/svg/1F627.svg'
import HateEmoji from 'openmoji/color/svg/1F621.svg'

function createAverageRating(ratingSum, allCount) {
    let averageRating = 0
    let averageRatingEmoji = null

    if (allCount >= 3) {
        averageRating = (5 * ratingSum[4] + 4 * ratingSum[3] + 3 * ratingSum[2] + 2 * ratingSum[1] + ratingSum[0]) / allCount

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

    return [averageRating, averageRatingEmoji]
}

export default createAverageRating