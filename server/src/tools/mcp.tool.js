import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET
});

export const createPost = async (status) => {
    try {
        const tweet = await twitterClient.v2.tweet(status);
        return {
            content: [
                {
                    type: "text",
                    text: `Tweeted: ${status} (ID: ${tweet.data.id})`
                }
            ]
        };
    } catch (error) {
        console.error("Error posting tweet:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to tweet: ${error.message || 'Unknown error'}`
                }
            ]
        };
    }
};
