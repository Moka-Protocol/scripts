const GET_DAILY_POSTS = `
  query GetDailyPosts($id: String!) {
    postDayMapping(id: $id) {
      id
      rewards
      posts(orderBy: upvotes, orderDirection:desc) {
        id
        upvotes
        timestamp
        user {
          id
        }
        post
        tags
      }
    }
  }
`;

const GET_WEEKLY_POSTS = `
  query GetWeeklyPosts($id: String!) {
    postWeekMapping(id: $id) {
      id
      rewards
      posts(orderBy: upvotes, orderDirection:desc) {
        id
        upvotes
        timestamp
        user {
          id
        }
        post
        tags
      }
    }
  }
`;

const GET_MONTHLY_POSTS = `
  query GetMonthlyPosts($id: String!) {
    postMonthMapping(id: $id) {
      id
      rewards
      posts(orderBy: upvotes, orderDirection:desc) {
        id
        upvotes
        timestamp
        user {
          id
        }
        post
        tags
      }
    }
  }
`;

module.exports = {
  GET_DAILY_POSTS,
  GET_WEEKLY_POSTS,
  GET_MONTHLY_POSTS
}