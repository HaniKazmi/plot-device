import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './finance/App';
import * as serviceWorker from './serviceWorker';
import Google from './vg/Google';



ReactDOM.render(
  <React.StrictMode>
    <Google />
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
