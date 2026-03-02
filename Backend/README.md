## UniTeam-API 💫

## Getting Started

### Requirements

- Node: `^18`
- NPM: `^10.7.0`

### Local Development

1. Install dependencies
```sh
npm install
```

2. Create `.env`

**Important!** DO NOT COMMIT THIS FILE
```env
PORT=3000
API_KEY={public_key}
API_SECRET_KEY={private_key}

DB_HOST=localhost
DB_USER=root
DB_PASS=example
DB_NAME=api
```

3. Import database schema `threa_db.sql`

4. Run development server

```sh
npm run dev
```

### Running example client-side

```env
npx serve public
```


## Testing API Endpoints

### User Endpoint

### Register
URL ENDPOINT:/v1/users/register
 - Method: POST
 - apikey: thread

Request Body:

    "username":"chino",
    "password":"shiiii",
    "email":"shiichino",
    "fullname":"sudochino",
    "imageUrl":"sadsad"

Expected Response:

    "message": "User created successfully",
    "userId": 9


### Login
URL ENDPOINT:/v1/users/login
 - Method: POST
 - apikey: thread

Request Body:

    "username":"chino",
    "password":"shiiii"

Expected Response:

    "message": "Login successful",
    "token": {Token}


### get current user profile
URL ENDPOINT:/v1/users/profile
 - Method: GET
 - Authentication: Required (token)
 - apikey: thread

Expected Response:
   
    "user": {
        "user_id": 9,
        "username": "chino",
        "email": "shiichino",
        "fullname": "sudochino",
        "password": "6c5b94ecb91f078a1f98059e6bfc6f577c5858ad49a4760b6ad4d883025bd306",
        "profile_picture": "sadsad",
        "created_at": "2024-10-25T15:50:54.000Z"

  
### Get the list of follower of the current user
URL ENDPOINT:/v1/users/follower-count
 - Method: GET
 -"Authentication: Required (token)
 - apikey: thread

 Expected Respond:

    "followerCount": {List of user, username}


### Get the list of who the current user following  
URL ENDPOINT:/v1/users/following
 - Method: GET
 - Authentication: Required (token)
 - apikey: thread

Expected Request:

    "following": [list of user, username]



### Get the number of the current user followers
URL ENDPOINT:/v1/users/{userid}/follower-count
 - Method: GET
 - Authentication: Required (token)
 - apikey: thread

Request Format:

    "followerCount": {number}


### Get the number of the current user following
URL ENDPOINT:/v1/users/following-count
 - Method: GET
 - Authentication: Required (token)
 - apikey: thread

Request Format:

    "followingCount": {number}



### Follow a user
URL ENDPOINT: /v1/users/follow/:postId
 - Method: POST 
 - Authentication: Required (token)
 - apikey: thread

Request Parameters:

    postId: ID of the post to repost 

Expected Response:

    "message": "succesfully followed user"
    
    

### Unfollow a user
URL ENDPOINT: /v1/users/follow/:postId
 - Method: Post
 - Authentication: Required (token)
 - apikey: thread
Request Parameters:

    postId: ID of the post to repost 

Expected Response:

    "message": "succesfully unfollowed user"
    
  
  
    
### Post Endpoint

### Create Post
URL Endpoint: /v1/posts/create
 - Method: POST
 - Authentication: Required (token)
 - apikey: thread

Request Body:

   "content": "First Post",
   "img_url": "http://example.com/sample-post-image.jpg"


Response Body:

   "postId": 1,
   "userId": 1,
   "content": "This is a sample post content.",
   "img_url":"http://example.com/sample-post-image.jpg"
   

### Delete Post
URL ENDPOINT: /v1/posts/:postId
 - Method: DELETE
 - Authentication: Required (token)

Request Parameters:

    "postId": "ID of the post to delete"


Response Body:

    "message": "Post deleted successfully" 

### Update Post
 - URL ENDPOINT: /v1/posts/update/:postId
 - Method: PATCH

Request Parameters:
      
    "postId": "ID of the post to update"

Request Body:

    "content": "Updated post content",
    "img_url": "http://example.com/updated-image.jpg"


Response Body:
  "message": "Post updated successfully" 


### Repost Post
URL ENDPOINT: /v1/posts/:postId/repost
 - Method: PATCH
 - Authentication: Required (token)

Request Parameters:
    "postId": "ID of the post to repost"

Response Body:

   "message": "Post reposted successfully.",
   "post": {
      "postId": 1,
      "userId": 1,
      "content": "First post",
      "img_url": "http://example.com/original-post-image.jpg"
   






### Like Endpoint

### Toggle Like
URL ENDPOINT: /v1/likes/toggle
 - Method: POST
 - Authentication: Required (token)
 - API Key: thread
Request Body:

    "postId": &ID of the post to like/unlike

Expected Response:

If like added:

    "message": "Like added and notification created"

If like removed:

    "message": "Like removed and notification deleted"



Get Like Count
URL ENDPOINT: /v1/likes/count/:postId
 - Method: GET
 - Authentication: Required (token)
 - API Key: thread
Expected Response:

    "likeCount":Number of likes on the specified post


Check If Post is Liked
URL ENDPOINT: /v1/likes/check/:postId
 - Method: POST
 - Authentication: Required (token)
 - API Key: thread
Expected Response:


    "isLiked": True if the post is liked by the user, false otherwise


Get Users Who Liked a Post
URL ENDPOINT: /v1/likes/users/:postId
 - Method: GET
 - Authentication: Required (token)
 - API Key: thread
Expected Response:

[
    {
        "userId": 1,
        "username": "chino"
    },
    {
        "userId": 2,
        "username": "alex"
    }
    // List of users who liked the specified post
]




### Create Comment
URL ENDPOINT: /v1/comments/:post_id
 - Method: POST
 - Authentication: Required (token)

Request Parameters:

    "post_id": "ID of the post to which the comment is being added"

Request Body:

    "user_id": 1,
    "content": "This is a sample comment.",
    "parent_comment_id": null



Response Body:

    "message": "Comment created successfully",
    "result": {
       "comment_id": 1,
       "post_id": 1,
       "user_id": 1,
       "content": "First comment.",
    

### Update Comment

URL ENDPOINT: /v1/comments/:comment_id

Method: PATCH
 - Authentication: Required (token)

Request Parameters:
    
    "comment_id": ID of the comment to update

Request Body:

    "content": "Updated comment content."



Response Body:

    "message": "Comment updated successfully",
    "result": {
       "comment_id": 1,
       "post_id": 1,
       "user_id": 1,
       "content": "Updated comment content."
   


### Delete Comment

URL ENDPOINT: /v1/comments/:comment_id
 - Method: DELETE
 - Authentication: Required (token)

Request Parameters:

    comment_id: ID of the comment to delete 

Response Body:

    "message": "Comment deleted successfully",
    "result": 
       "comment_id": 1,
       "post_id": 1
   
