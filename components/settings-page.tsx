'use client'

import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/convex-error'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { useCustomInstructionsStore } from '@/lib/stores/custom-instructions-store'
import { CustomInstructionsSchema, type CustomInstructions } from '@/lib/types'
import { useQueryWithStatus } from '@/lib/utils'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation } from 'convex/react'
import { ArrowLeft, KeyRound, Loader2, LogOut, Mail, ShieldAlert, Sparkles, UserRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useDocumentTitle } from 'usehooks-ts'
import { z } from 'zod'

const openRouterKeySchema = z
  .string()
  .min(1, 'API key is required')
  .regex(/^sk-or-v1-/, 'API key must start with sk-or-v1-')

type CustomInstructionsForm = Required<CustomInstructions>

const EMPTY_CUSTOM_INSTRUCTIONS: CustomInstructionsForm = {
  name: '',
  profession: '',
  aboutUser: '',
  responseInstructions: '',
}

const toCustomInstructionsForm = (customInstructions: CustomInstructions | null): CustomInstructionsForm => ({
  name: customInstructions?.name ?? '',
  profession: customInstructions?.profession ?? '',
  aboutUser: customInstructions?.aboutUser ?? '',
  responseInstructions: customInstructions?.responseInstructions ?? '',
})

const isSameCustomInstructionsForm = (left: CustomInstructionsForm, right: CustomInstructionsForm) =>
  left.name === right.name &&
  left.profession === right.profession &&
  left.aboutUser === right.aboutUser &&
  left.responseInstructions === right.responseInstructions

const getDisplayName = (name?: string | null) => {
  if (!name) {
    return 'SpeedChat User'
  }

  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : 'SpeedChat User'
}

const getDisplayEmail = (email?: string | null) => {
  if (!email) {
    return 'No email available'
  }

  const trimmed = email.trim()
  return trimmed.length > 0 ? trimmed : 'No email available'
}

const getInitials = (name: string, email: string) => {
  const nameParts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
  }

  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase()
  }

  if (email.length > 0) {
    return email.slice(0, 2).toUpperCase()
  }

  return 'SC'
}

export function SettingsPage() {
  useDocumentTitle('Speed Chat - Settings')

  const router = useRouter()
  const { signOut } = useAuthActions()
  const { isLoading: isAuthLoading } = useConvexAuth()
  const { data: user, isPending: isUserPending } = useQueryWithStatus(api.users.getCurrentUser, {})

  const config = useChatConfigStore((store) => store.config)
  const updateConfig = useChatConfigStore((store) => store.updateConfig)

  const customInstructions = useCustomInstructionsStore((store) => store.customInstructions)
  const setCustomInstructions = useCustomInstructionsStore((store) => store.setCustomInstructions)

  const saveCustomInstructions = useMutation(api.customInstructions.upsertCustomInstructions)
  const deleteAllChats = useMutation(api.delete.deleteAllChats)
  const deleteAccount = useMutation(api.delete.deleteAccount)

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  const [customInstructionsForm, setCustomInstructionsForm] =
    useState<CustomInstructionsForm>(EMPTY_CUSTOM_INSTRUCTIONS)
  const [customInstructionsError, setCustomInstructionsError] = useState<string | null>(null)

  const [isSavingCustomInstructions, setIsSavingCustomInstructions] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [deleteAllChatsDialogOpen, setDeleteAllChatsDialogOpen] = useState(false)
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false)
  const [isDeleteAllChatsLoading, setIsDeleteAllChatsLoading] = useState(false)
  const [isDeleteAccountLoading, setIsDeleteAccountLoading] = useState(false)

  useEffect(() => {
    setApiKeyInput(config.apiKey ?? '')
  }, [config.apiKey])

  useEffect(() => {
    setCustomInstructionsForm(toCustomInstructionsForm(customInstructions))
  }, [customInstructions])

  const displayName = getDisplayName(user?.name)
  const displayEmail = getDisplayEmail(user?.email)
  const profileInitials = useMemo(() => getInitials(displayName, displayEmail), [displayEmail, displayName])
  const isAuthInfoLoading = isAuthLoading || isUserPending

  const savedCustomInstructions = useMemo(() => toCustomInstructionsForm(customInstructions), [customInstructions])
  const hasCustomInstructionChanges = !isSameCustomInstructionsForm(customInstructionsForm, savedCustomInstructions)
  const hasApiKeyChanges = apiKeyInput !== (config.apiKey ?? '')

  const handleSaveApiKey = () => {
    const parsedKey = openRouterKeySchema.safeParse(apiKeyInput)
    if (!parsedKey.success) {
      setApiKeyError(parsedKey.error.issues[0]?.message ?? 'Invalid API key')
      return
    }

    updateConfig({ apiKey: parsedKey.data })
    setApiKeyError(null)
    toast.success('API key saved')
  }

  const handleResetApiKey = () => {
    setApiKeyInput(config.apiKey ?? '')
    setApiKeyError(null)
  }

  const handleSaveCustomInstructions = async () => {
    const parsed = CustomInstructionsSchema.safeParse(customInstructionsForm)
    if (!parsed.success) {
      setCustomInstructionsError(parsed.error.issues[0]?.message ?? 'Invalid custom instructions')
      return
    }

    try {
      setIsSavingCustomInstructions(true)
      const saved = await saveCustomInstructions(parsed.data)
      setCustomInstructions(saved)
      setCustomInstructionsForm(toCustomInstructionsForm(saved))
      setCustomInstructionsError(null)
      toast.success(saved ? 'Custom instructions saved' : 'Custom instructions cleared')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSavingCustomInstructions(false)
    }
  }

  const handleResetCustomInstructions = () => {
    setCustomInstructionsForm(savedCustomInstructions)
    setCustomInstructionsError(null)
  }

  const handleDeleteAllChats = async () => {
    try {
      setIsDeleteAllChatsLoading(true)
      await deleteAllChats()
      toast.success('All chats deleted successfully')
      setDeleteAllChatsDialogOpen(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleteAllChatsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleteAccountLoading(true)
      await deleteAccount()
      toast.success('Account deleted successfully')
      setDeleteAccountDialogOpen(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleteAccountLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <div className="relative flex h-screen flex-col overflow-hidden">
        <Header />
        <div className="relative flex-1 overflow-y-auto">
          <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-16 pb-8 md:px-8">
            <section className="border-border/70 bg-card/90 overflow-hidden rounded-2xl border shadow-sm backdrop-blur">
              <div className="p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted border-border/70 flex size-16 items-center justify-center overflow-hidden rounded-2xl border">
                      {isAuthInfoLoading ? (
                        <Skeleton className="size-full rounded-none" />
                      ) : user?.image ? (
                        <Image
                          src={user.image}
                          alt={`${displayName} profile photo`}
                          width={64}
                          height={64}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold tracking-wide">{profileInitials}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">Settings</p>
                      <h1 className="text-2xl font-semibold tracking-tight">Account Preferences</h1>
                      {isAuthInfoLoading ? (
                        <div className="flex flex-col gap-2 pt-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-56" />
                        </div>
                      ) : (
                        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="size-4" />
                            {displayName}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Mail className="size-4" />
                            {displayEmail}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                      <Link href="/">
                        <ArrowLeft className="size-4" />
                        Back to chat
                      </Link>
                    </Button>
                    <Button variant="destructive" onClick={handleSignOut} disabled={isSigningOut}>
                      {isSigningOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                      Sign out
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6">
              <section className="border-border/70 bg-card/90 rounded-2xl border p-5 shadow-sm backdrop-blur">
                <div className="mb-5 space-y-1">
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                    <KeyRound className="size-5" />
                    OpenRouter API Key
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    This key is stored in your browser and used to call OpenRouter when chatting.
                  </p>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="settings-api-key">API key</Label>
                  <Input
                    id="settings-api-key"
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={apiKeyInput}
                    onChange={(event) => {
                      setApiKeyInput(event.target.value)
                      setApiKeyError(null)
                    }}
                    aria-invalid={apiKeyError !== null}
                  />
                  {apiKeyError && <p className="text-destructive text-sm">{apiKeyError}</p>}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={handleSaveApiKey} disabled={!hasApiKeyChanges}>
                    Save API key
                  </Button>
                  <Button variant="outline" onClick={handleResetApiKey} disabled={!hasApiKeyChanges}>
                    Reset
                  </Button>
                </div>
              </section>

              <section className="border-border/70 bg-card/90 rounded-2xl border p-5 shadow-sm backdrop-blur">
                <div className="mb-5 space-y-1">
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="size-5" />
                    Custom Instructions
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Tell the model about you and how it should respond in every chat.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="custom-instructions-name">Your name</Label>
                    <Input
                      id="custom-instructions-name"
                      value={customInstructionsForm.name}
                      onChange={(event) => {
                        setCustomInstructionsForm((current) => ({ ...current, name: event.target.value }))
                        setCustomInstructionsError(null)
                      }}
                      placeholder="Sam Altman"
                      aria-invalid={customInstructionsError !== null}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="custom-instructions-profession">Profession</Label>
                    <Input
                      id="custom-instructions-profession"
                      value={customInstructionsForm.profession}
                      onChange={(event) => {
                        setCustomInstructionsForm((current) => ({ ...current, profession: event.target.value }))
                        setCustomInstructionsError(null)
                      }}
                      placeholder="Software engineer"
                      aria-invalid={customInstructionsError !== null}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="custom-instructions-about-user">More about you</Label>
                    <Textarea
                      id="custom-instructions-about-user"
                      value={customInstructionsForm.aboutUser}
                      onChange={(event) => {
                        setCustomInstructionsForm((current) => ({ ...current, aboutUser: event.target.value }))
                        setCustomInstructionsError(null)
                      }}
                      placeholder="What should the model know about you?"
                      rows={4}
                      aria-invalid={customInstructionsError !== null}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="custom-instructions-response-instructions">Additional instructions</Label>
                    <Textarea
                      id="custom-instructions-response-instructions"
                      value={customInstructionsForm.responseInstructions}
                      onChange={(event) => {
                        setCustomInstructionsForm((current) => ({
                          ...current,
                          responseInstructions: event.target.value,
                        }))
                        setCustomInstructionsError(null)
                      }}
                      placeholder="Example: Keep answers concise, include numbered steps, and ask follow-up questions when needed."
                      rows={6}
                      aria-invalid={customInstructionsError !== null}
                    />
                  </div>

                  {customInstructionsError && <p className="text-destructive text-sm">{customInstructionsError}</p>}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={handleSaveCustomInstructions}
                    disabled={isSavingCustomInstructions || !hasCustomInstructionChanges}
                  >
                    {isSavingCustomInstructions ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save instructions
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetCustomInstructions}
                    disabled={isSavingCustomInstructions || !hasCustomInstructionChanges}
                  >
                    Reset
                  </Button>
                </div>
              </section>
            </div>

            <section className="border-destructive/30 bg-destructive/5 rounded-2xl border p-5 shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-destructive inline-flex items-center gap-2 text-lg font-semibold">
                  <ShieldAlert className="size-5" />
                  Danger Zone
                </h2>
                <p className="text-muted-foreground text-sm">These actions are permanent and cannot be undone.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="border-border/80 bg-background/70 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Delete all chats</p>
                    <p className="text-muted-foreground text-sm">
                      Remove your entire chat history but keep your account.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setDeleteAllChatsDialogOpen(true)}>
                    Delete all chats
                  </Button>
                </div>

                <Separator />

                <div className="border-border/80 bg-background/70 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Delete account</p>
                    <p className="text-muted-foreground text-sm">
                      Permanently remove your account and all associated data.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setDeleteAccountDialogOpen(true)}>
                    Delete account
                  </Button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <ConfirmationDialog
        open={deleteAllChatsDialogOpen}
        onOpenChange={setDeleteAllChatsDialogOpen}
        onConfirm={handleDeleteAllChats}
        title="Delete all chats"
        description="Are you sure you want to delete all your chats? This action cannot be undone."
        confirmText="Delete all chats"
        isLoading={isDeleteAllChatsLoading}
      />

      <ConfirmationDialog
        open={deleteAccountDialogOpen}
        onOpenChange={setDeleteAccountDialogOpen}
        onConfirm={handleDeleteAccount}
        title="Delete account"
        description="Are you sure you want to delete your account? This will permanently delete all your chats and data. This action cannot be undone."
        confirmText="Delete account"
        isLoading={isDeleteAccountLoading}
      />
    </>
  )
}
