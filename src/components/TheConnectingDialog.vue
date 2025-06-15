<template>
    <v-dialog v-model="showDialog" persistent :width="400">
        <v-card dark>
            <v-toolbar flat dense color="primary">
                <v-toolbar-title>
                    <span class="subheading">
                        <v-icon class="mdi mdi-connection" left></v-icon>
                        <template v-if="connectingFailed">{{ $t("ConnectionDialog.Failed", {'host': formatHostname}) }}</template>
                        <template v-else-if="isConnecting">{{ $t("ConnectionDialog.Connecting", {'host': formatHostname}) }}</template>
                        <template v-else-if="needLogin">{{ $t("ConnectionDialog.Login") }}</template>
                        <template v-else>{{ formatHostname }}</template>
                    </span>
                </v-toolbar-title>
            </v-toolbar>
            <v-card-text class="pt-5" v-if="isConnecting">
                <v-progress-linear color="white" indeterminate></v-progress-linear>
            </v-card-text>
            <v-card-text class="pt-5" v-else-if="needLogin">
                <v-form v-model="form.valid" @submit.prevent="login">
                    <v-row v-if="form.error">
                        <v-col>
                            <v-alert
                                border="left"
                                colored-border
                                type="warning"
                                elevation="2"
                                class="mx-auto"
                                max-width="500"
                                icon="mdi-lock-outline"
                            >{{ $t('ConnectionDialog.WrongLogin') }}</v-alert>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col>
                            <v-text-field
                                v-model="form.username"
                                :label="$t('ConnectionDialog.Username')"
                                autocomplete="username"
                                hide-details
                                outlined
                                dense
                                :disabled="form.loading"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col>
                            <v-text-field
                                v-model="form.password"
                                :label="$t('ConnectionDialog.Password')"
                                autocomplete="current-password"
                                type="password"
                                outlined
                                dense
                                hide-details
                                :disabled="form.loading"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col class="text-center">
                            <v-btn type="submit" color="primary" class="mx-auto" @loading="form.loading">{{ $t('ConnectionDialog.BtnLogin') }}</v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
            <v-card-text class="pt-5" v-if="!isConnecting && connectingFailed">
                <connection-status :moonraker="false"></connection-status>
                <p class="text-center mt-3">{{ $t("ConnectionDialog.CannotConnectTo", {'host': formatHostname}) }}</p>
        <panel :title="titleText" :icon="mdiConnection" card-class="the-connection-dialog" :margin-bottom="false">
            <v-card-text v-if="connectingFailed" class="pt-5">
                <connection-status :moonraker="false" />
                <p class="text-center mt-3 mb-0">
                    {{ $t('ConnectionDialog.CannotConnectTo', { host: formatHostname }) }}
                </p>
                <p v-if="connectionFailedMessage" class="text-center mt-1 red--text">
                    {{ $t('ConnectionDialog.ErrorMessage', { message: connectionFailedMessage }) }}
                </p>
                <template v-if="counter > 2">
                    <v-divider class="my-3" />
                    <p>{{ $t('ConnectionDialog.CheckMoonrakerLog') }}</p>
                    <ul>
                        <li>~/printer_data/logs/moonraker.log</li>
                    </ul>
                    <v-divider class="mt-4 mb-5" />
                </template>
                <div class="text-center mt-3">
                    <v-btn v-if="helpButtonUrl" class="text--disabled mr-3" :href="helpButtonUrl" target="_blank">
                        <v-icon left>{{ mdiHelp }}</v-icon>
                        {{ $t('ConnectionDialog.Help') }}
                    </v-btn>
                    <v-btn class="primary--text" @click="reconnect">{{ $t('ConnectionDialog.TryAgain') }}</v-btn>
                </div>
            </v-card-text>
            <v-card-text v-else class="pt-5">
                <v-progress-linear :color="progressBarColor" indeterminate />
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script lang="ts">
import Component from 'vue-class-component'
import { Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import ThemeMixin from '@/components/mixins/theme'
import ConnectionStatus from '@/components/ui/ConnectionStatus.vue'
import { mdiConnection, mdiHelp } from '@mdi/js'
import axios from "axios";

@Component({
    components: {
        ConnectionStatus,
    },
})
export default class TheUpdateDialog extends Mixins(BaseMixin) {
    private counter = 0
    private form = {
        valid: false,
        loading: false,
        error: false,
        username: "",
        password: ""
    }
export default class TheConnectingDialog extends Mixins(BaseMixin, ThemeMixin) {
    mdiConnection = mdiConnection
    mdiHelp = mdiHelp

    counter = 0

    get hostname() {
        return this.$store.state.socket.hostname
    }

    get port() {
        return this.$store.state.socket.port
    }

    get path() {
        return this.$store.state.socket.path
    }

    get formatHostname() {
        return parseInt(this.port) !== 80 && this.port !== ''
            ? this.hostname + ':' + this.port + this.path
            : this.hostname + this.path
    }

    get isConnecting() {
        return this.$store.state.socket.isConnecting
    }

    get needLogin() {
        return this.$store.state.socket.needLogin
    }

    get connectingFailed() {
        return this.$store.state.socket.connectingFailed
    }

    get showDialog() {
        return true
    }

    get titleText() {
        if (this.connectingFailed) return this.$t('ConnectionDialog.Failed', { host: this.formatHostname })
        if (this.isConnecting) return this.$t('ConnectionDialog.Connecting', { host: this.formatHostname })
        if (!this.guiIsReady) return this.$t('ConnectionDialog.Initializing')

        return this.formatHostname
    }

    get connectionFailedMessage() {
        return this.$store.state.socket.connectionFailedMessage ?? null
    }

    get helpButtonUrl() {
        if (!this.$store.state.socket.connectionFailedMessage) return null

        return `https://docs.mainsail.xyz/faq/mainsail_errors/connection-${this.connectionFailedMessage?.toLowerCase()}`
    }

    async mounted() {
        const statusCode = await this.checkSocket()
        if (statusCode === 200) {
            this.$socket.connect()
        } else if (statusCode === 401) {
            await this.$store.dispatch("socket/setData", { needLogin: true })
        } else {
            this.counter = 2
            await this.$store.dispatch('socket/notReachable')
        }
    }

    async checkSocket() {
        return this.$httpClient.get("/server/info")
            .then((result) => { return result.status })
            .catch((error) => {
                return error?.response?.status ?? 0
            })
    }

    async login() {
        this.form.error = false
        this.form.loading = true

        try {
            await this.$store.dispatch("socket/login", {
                username: this.form.username,
                password: this.form.password
            })
        } catch(err) {
            window.console.error(err)
            this.form.error = true
        }
        this.form.loading = false

        if (!this.form.error) {
            const token = await this.$store.dispatch("socket/getOneShotToken")
            this.$socket.connect(token)
        }
    }

    reconnect() {
        this.counter++
        this.$store.dispatch('socket/setData', { connectingFailed: false })
        this.$socket.connect()
    }
}
</script>
