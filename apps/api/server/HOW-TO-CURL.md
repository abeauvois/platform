Get the cookie session from the Chrome tools (network)

```bash
# Get todos by user id
curl "http://localhost:5000/api/todos" --cookie better-auth.session_token=9slDqW6VeiByYGRbiAyErUBOzES5beGa.1L4SoeFRg67T7Gn6dYO3afo7ZinW8yonPzrXPLMCCuw%3D | jq

# response
[
  {
    "id": "beba5b65-5b99-4a32-8195-34e7c7c52e7d",
    "userId": "xwFAvbNoCGNmZabbEsfvwWfiWgMltZnB",
    "title": "sfldmfù tets 2",
    "subtitle": null,
    "description": "slkdlkfj dlkfjldjf",
    "completed": false,
    "createdAt": "2025-11-24T20:15:27.664Z",
    "updatedAt": "2025-11-24T20:15:27.664Z"
  },
  {
    "id": "0c537e8a-3a73-4dad-a297-933c11aeec3e",
    "userId": "xwFAvbNoCGNmZabbEsfvwWfiWgMltZnB",
    "title": "test t1",
    "subtitle": null,
    "description": "dfsdfsdg",
    "completed": false,
    "createdAt": "2025-11-24T18:15:47.661Z",
    "updatedAt": "2025-11-24T18:15:47.661Z"
  }
]

# create a bookmark
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "http://example.com", "tags": ["tag1", "tag2"], "summary": "This is a summary of the bookmark."}' \
  http://localhost:5000/api/bookmarks --cookie better-auth.session_token=9slDqW6VeiByYGRbiAyErUBOzES5beGa.1L4SoeFRg67T7Gn6dYO3afo7ZinW8yonPzrXPLMCCuw%3D

# response
{
    "url":"http://localhost:5000/api/bookmarks","sourceAdapter":"Other",
    "tags":["tag1","tag2"],
    "summary":"This is a summary of the bookmark.",
    "rawContent":"","createdAt":"2025-11-25T13:49:23.183Z","updatedAt":"2025-11-25T13:49:23.183Z","userId":"xwFAvbNoCGNmZabbEsfvwWfiWgMltZnB"
}

# get bokmarks
    curl "http://localhost:5000/api/bookmarks" --cookie better-auth.session_token=9slDqW6VeiByYGRbiAyErUBOzES5beGa.1L4SoeFRg67T7Gn6dYO3afo7ZinW8yonPzrXPLMCCuw%3D | jq

# response
[
  {
    "url": "http://localhost:5000/api/bookmarks",
    "sourceAdapter": "Other",
    "tags": [
      "tag1",
      "tag2"
    ],
    "summary": "This is a summary of the bookmark.",
    "rawContent": "",
    "createdAt": "2025-11-25T13:49:23.183Z",
    "updatedAt": "2025-11-25T13:49:23.183Z",
    "userId": "xwFAvbNoCGNmZabbEsfvwWfiWgMltZnB"
  }
]
```
