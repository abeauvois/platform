/**
 * Represents an email file extracted from a source (zip, directory, etc.)
 */
export interface TwitterMessage {
    id: string;
    content: string;
}


// fixture Twitter API response for tweet content
// https://api.x.com/2/tweets/:id
// {
//     "data": {
//         "id": "1975481986254053517",
//         "edit_history_tweet_ids": [
//             "1975481986254053517"
//         ],
//         "text": "FAANG software engineer shares how they vibe code.\n\n(TDD is still the key) https://t.co/rujK72QJoE"
//     }
// }
