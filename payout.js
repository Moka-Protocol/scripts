// node payout.js Ropsten Day 2021-10-20 Execute > consoleLogs/ropsten/day_2021-10-20

const gql = require("graphql-tag");
const ApolloClient = require("@apollo/client/core").ApolloClient;
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const createHttpLink = require("apollo-link-http").createHttpLink;
const InMemoryCache = require("apollo-cache-inmemory").InMemoryCache;
const { ethers } = require("ethers");

const MokaTokenABI = require('./src/MokaToken.json');

const TOKEN_DISTRIBUTION = {
  1: [100],
  2: [65,35],
  3: [50,30,20],
  4: [40,30,20,10],
  5: [40,23,16,12,9],
  6: [35,22,17,12,8,6],
  7: [33,20,15,11,8,7,6],
  8: [31,20,13,10,8,7,6,5],
  9: [29,18,13,10,8,7,6,5,4],
  10: [27,15,13,10,9,7,7,5,4,3]
};

const { GET_DAILY_POSTS, GET_WEEKLY_POSTS, GET_MONTHLY_POSTS } = require('./src/queries');
const { KEYS, JSONRPC, SUBGRAPHIURIS, TOKENCONTRACT, POSTSCONTRACT } = require('./src/keys');

const HELP_MESSAGE = 'Argument Structure - [NETWORK] [TIMEFRAME] [TIMEID] [EXECTYPE]\nExample - [Ropsten] [Day/Week/Month] [2021-10-1] [Print/Execute]';

const VALID_NETWORKS = ['Ropsten', 'Matic'];
const VALID_TIMEFRAMES = ['Day', 'Week', 'Month'];
const VALID_EXEC = ['Print', 'Execute'];

function getGQLQuery(timeframe) {
  if (timeframe === 'Day') {
    return gql(GET_DAILY_POSTS);
  } else if (timeframe === 'Week') {
    return gql(GET_WEEKLY_POSTS);
  } else if (timeframe === 'Month') {
    return gql(GET_MONTHLY_POSTS);
  }
}

function gqlResponse(timeframe, fetchResult) {
  if (timeframe === 'Day') {
    if (fetchResult && fetchResult.postDayMapping) {
      return {
        rewards: fetchResult.postDayMapping.rewards,
        posts: fetchResult.postDayMapping.posts
      };
    }

    return null;
  } else if (timeframe === 'Week') {
    if (fetchResult && fetchResult.postWeekMapping) {
      return {
        rewards: fetchResult.postWeekMapping.rewards,
        posts: fetchResult.postWeekMapping.posts
      };
    }

    return null;
  } else if (timeframe === 'Month') {
    if (fetchResult && fetchResult.postMonthMapping) {
      return {
        rewards: fetchResult.postMonthMapping.rewards,
        posts: fetchResult.postMonthMapping.posts
      };
    }

    return null;
  }
}

const settlePrize = async () => {
  const args = process.argv.slice(2);

  let network = args[0];
  let timeframe = args[1];
  let timeId = args[2];
  let execType = args[3];

  if (
    args.length !== 4 ||
    !VALID_NETWORKS.includes(network) ||
    !VALID_TIMEFRAMES.includes(timeframe) ||
    !VALID_EXEC.includes(execType)
  ) {
    console.log('[ERROR] Invalid Parameters');
    console.log(HELP_MESSAGE);
    return;
  }

  const client = new ApolloClient({ link: createHttpLink({ uri: SUBGRAPHIURIS[network], fetch: fetch }), cache: new InMemoryCache() });
  const provider = new ethers.providers.JsonRpcProvider(JSONRPC[network]);
  const privateKey = KEYS[network];
  const wallet = new ethers.Wallet(privateKey, provider);
  const MokaTokenContract = new ethers.Contract(TOKENCONTRACT[network], MokaTokenABI, wallet);

  try {
    const result = await client.query({
      query: getGQLQuery(timeframe),
      variables: { id: timeId }
    });

    let gqlResult = gqlResponse(timeframe, result.data);

    let tokenDistribution = [];
    let mokaForumSettleData = [];
    
    if (gqlResult) {
      let rewards = gqlResult.rewards;
      let posts = gqlResult.posts;
      let percDistribution = (posts.length > 10) ? TOKEN_DISTRIBUTION[10] : TOKEN_DISTRIBUTION[posts.length];
      let sumDistribution = 0;

      console.log('rewards', rewards);
      console.log('percDistribution', percDistribution);

      for (var i = 0; i < percDistribution.length; i++) {
        let tokensToDistribute = Math.floor((rewards * (percDistribution[i] / 100)) * (10 ** 18));
        tokenDistribution.push(tokensToDistribute);
        sumDistribution += tokensToDistribute;

        mokaForumSettleData.push({
          dateId: ethers.utils.formatBytes32String(timeId),
          rank: ethers.BigNumber.from(i + 1),
          prize: tokensToDistribute.toString(),
          postId: ethers.BigNumber.from(posts[i].id),
          user: posts[i].user.id,
          postsContract: POSTSCONTRACT[network]
        });
      }
  
      console.log('SETTLE DATA');
      console.log('REWARDS -', parseInt(rewards), ' DISTRIBUTED -', (sumDistribution / (10 ** 18)));
      console.table(tokenDistribution);
      console.table(mokaForumSettleData);
  
    } else {
      console.log('SETTLE DATA');
      console.log('[]');
    }

    if (execType === 'Execute') {
      let txResponse;
      if (timeframe === 'Day') {
        console.log(`\nTX settleDailyPrize(${timeId})\n`);
        txResponse = await MokaTokenContract.settleDailyPrize(ethers.utils.formatBytes32String(timeId), mokaForumSettleData);
      } else if (timeframe === 'Week') {
        console.log(`\nTX settleWeeklyPrize(${timeId})\n`);
        txResponse = await MokaTokenContract.settleWeeklyPrize(ethers.utils.formatBytes32String(timeId), mokaForumSettleData);
      } else if (timeframe === 'Month') {
        console.log(`\nTX settleMonthlyPrize(${timeId})\n`);
        txResponse = await MokaTokenContract.settleMonthlyPrize(ethers.utils.formatBytes32String(timeId), mokaForumSettleData);
      }

      console.log('✔ TX COMPLETE - ', txResponse.hash);
    }
  } catch (err) {
    console.log('[ERROR] ', err);
  }
};

settlePrize();