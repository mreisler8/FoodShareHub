/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// Register the app
AppRegistry.registerComponent(appName, () => App);