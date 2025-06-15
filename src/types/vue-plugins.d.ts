import Vue from 'vue'
import { WebSocketClient } from "@/plugins/webSocketClient"
import {AxiosInstance} from "axios";


declare module 'vue/types/vue' {
    interface VueConstructor {
        $socket: WebSocketClient,
        $httpClient: AxiosInstance
    }

    interface Vue {
        $socket: WebSocketClient,
        $httpClient: AxiosInstance
    }
}