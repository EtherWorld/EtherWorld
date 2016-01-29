# EtherWorld

EtherWorld is a virtual reality multi-user content creation tool. Create a room today, and build content with your friends.

[![EtherWorld screenshot](https://avatars3.githubusercontent.com/u/11998481?v=3&s=200 "EtherWorld screenshot")](https://etherworld.herokuapp.com/)


## Installation

1. Clone the git repository from GitHub:

        git clone git@github.com:EtherWorld/etherworld.git

2. Open the working directory:

        cd etherworld

3. Install the Node dependencies:

        npm install

4. Install Redis:

        brew install redis

5. Set up Redis:

        brew info redis


## Development

To start the server and file watchers (for building the JS/CSS upon file change):

    npm run dev

Then launch the site from your favourite browser:

[__http://localhost:3000/__](http://localhost:3000/)

If you wish to serve the site from a different port:

    PORT=8000 npm run dev


## Deployment

In production, the server is run like so:

    npm start

Alternatively:

    npm run prod

To run the server à la Heroku:

    foreman start web


## Licence

[MIT Licence](LICENCE)


## Contributing

[Contributions are very welcome!](CONTRIBUTING.md)
