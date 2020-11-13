import LoveEmoji from '../openmoji-edited/1F929.svg'
import LikeEmoji from '../openmoji-edited/1F60A.svg'
import NeutralEmoji from '../openmoji-edited/1F610.svg'
import DislikeEmoji from '../openmoji-edited/1F627.svg'
import HateEmoji from '../openmoji-edited/1F621.svg'

function createAverageRating(ratingCounts) {
    let allCount = ratingCounts[4] + ratingCounts[3] + ratingCounts[2] + ratingCounts[1] + ratingCounts[0]

    let averageRating = 0
    let averageRatingEmoji = null

    if (allCount >= 3) {
        averageRating = (5 * ratingCounts[4] + 4 * ratingCounts[3] + 3 * ratingCounts[2] + 2 * ratingCounts[1] + 1 * ratingCounts[0]) / allCount

        // Hate:    1.0 - 1.8
        // Dislike: 1.8 - 2.6
        // Neutral: 2.6 - 3.4
        // Like:    3.4 - 4.2
        // Love:    4.2 - 5.0

        if (averageRating <= 1.8) {
            averageRatingEmoji = HateEmoji
        } else if (averageRating <= 2.6) {
            averageRatingEmoji = DislikeEmoji
        } else if (averageRating <= 3.4) {
            averageRatingEmoji = NeutralEmoji
        } else if (averageRating <= 4.2) {
            averageRatingEmoji = LikeEmoji
        } else if (averageRating <= 5.0) {
            averageRatingEmoji = LoveEmoji
        }
    }

    return [averageRating, averageRatingEmoji]
}

export default createAverageRating
