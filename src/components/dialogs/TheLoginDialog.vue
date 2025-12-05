<template>
    <v-dialog :value="true" persistent :width="400">
        <panel :title="$t('LoginDialog.Login')" :icon="mdiLogin" card-class="the-login-dialog" :margin-bottom="false">
            <v-form v-model="formValid" @submit.prevent="login">
                <v-card-text>
                    <v-alert v-if="errorMessage" type="error" dense class="mb-4">
                        {{ errorMessage }}
                    </v-alert>

                    <v-text-field
                        v-model="username"
                        :rules="[(v) => !!v || $t('LoginDialog.UsernameRequired')]"
                        :label="$t('LoginDialog.Username')"
                        required
                        outlined
                        dense
                        hide-details="auto"
                        class="mb-3"
                        @keyup.enter="focusPassword" />

                    <v-text-field
                        ref="password"
                        v-model="password"
                        :rules="[(v) => !!v || $t('LoginDialog.PasswordRequired')]"
                        :label="$t('LoginDialog.Password')"
                        :type="showPassword ? 'text' : 'password'"
                        :append-icon="showPassword ? mdiEyeOff : mdiEye"
                        required
                        outlined
                        dense
                        hide-details="auto"
                        class="mb-3"
                        @click:append="showPassword = !showPassword" />

                    <v-select
                        v-if="availableSources.length > 1"
                        v-model="source"
                        :items="availableSources"
                        :label="$t('LoginDialog.AuthSource')"
                        outlined
                        dense
                        hide-details="auto" />
                </v-card-text>

                <v-card-actions>
                    <v-spacer />
                    <v-btn color="primary" type="submit" :disabled="!formValid" :loading="isLoading">
                        {{ $t('LoginDialog.Login') }}
                    </v-btn>
                </v-card-actions>
            </v-form>
        </panel>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Ref, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'
import { mdiLogin, mdiEye, mdiEyeOff } from '@mdi/js'

@Component({
    components: { Panel },
})
export default class TheLoginDialog extends Mixins(BaseMixin) {
    mdiLogin = mdiLogin
    mdiEye = mdiEye
    mdiEyeOff = mdiEyeOff

    @Ref('password') inputPassword!: HTMLInputElement

    formValid = false
    username = ''
    password = ''
    source: string | null = null
    showPassword = false
    isLoading = false
    errorMessage = ''

    get availableSources(): string[] {
        return this.$store.state.socket.availableAuthSources ?? ['moonraker']
    }

    get defaultSource(): string {
        return this.$store.state.socket.defaultAuthSource ?? 'moonraker'
    }

    @Watch('defaultSource', { immediate: true })
    onDefaultSourceChanged(newVal: string) {
        this.source = newVal
    }

    focusPassword() {
        this.inputPassword?.focus()
    }

    async login() {
        this.isLoading = true
        this.errorMessage = ''

        try {
            await this.$store.dispatch('socket/login', {
                username: this.username,
                password: this.password,
                source: this.source,
            })

            this.password = ''
            await this.$socket.connect(true)
        } catch (error: any) {
            window.console.error('Login failed:', error)

            this.errorMessage = error.response?.data?.error?.message || this.$t('LoginDialog.LoginFailed').toString()
        } finally {
            this.isLoading = false
        }
    }
}
</script>
