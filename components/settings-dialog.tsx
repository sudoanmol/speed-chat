'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/convex-error'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { useCustomInstructionsStore } from '@/lib/stores/custom-instructions-store'
import { CustomInstructionsSchema, type CustomInstructions } from '@/lib/types'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmationDialog } from './confirmation-dialog'

const openRouterKeySchema = z
  .string()
  .min(1, 'API key is required')
  .regex(/^sk-or-v1-/, 'API key must start with sk-or-v1-')

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

const hasAnyCustomInstructions = (customInstructions: CustomInstructions | null) =>
  Boolean(
    customInstructions?.name ||
    customInstructions?.profession ||
    customInstructions?.aboutUser ||
    customInstructions?.responseInstructions
  )
function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const router = useRouter()
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [customInstructionsDialogOpen, setCustomInstructionsDialogOpen] = useState(false)
  const [deleteAllChatsDialogOpen, setDeleteAllChatsDialogOpen] = useState(false)
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false)
  const [isDeleteAllChatsLoading, setIsDeleteAllChatsLoading] = useState(false)
  const [isDeleteAccountLoading, setIsDeleteAccountLoading] = useState(false)

  const config = useChatConfigStore((s) => s.config)
  const customInstructions = useCustomInstructionsStore((s) => s.customInstructions)
  const deleteAllChats = useMutation(api.delete.deleteAllChats)
  const deleteAccount = useMutation(api.delete.deleteAccount)

  const handleDeleteAllChats = async () => {
    try {
      setIsDeleteAllChatsLoading(true)
      await deleteAllChats()
      toast.success('All chats deleted successfully')
      setDeleteAllChatsDialogOpen(false)
      onOpenChange(false)
      router.push('/')
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
      onOpenChange(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleteAccountLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your SpeedChat preferences</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
            <Separator />
            <SettingsRow label="OpenRouter API Key">
              <Button variant="ghost" size="sm" onClick={() => setApiKeyDialogOpen(true)}>
                {config.apiKey ? 'Change' : 'Add'}
              </Button>
            </SettingsRow>
            <Separator />
            <SettingsRow label="Custom instructions">
              <Button variant="ghost" size="sm" onClick={() => setCustomInstructionsDialogOpen(true)}>
                {hasAnyCustomInstructions(customInstructions) ? 'Change' : 'Add'}
              </Button>
            </SettingsRow>
            <Separator />
            <SettingsRow label="Delete all chats">
              <Button variant="destructive" size="sm" onClick={() => setDeleteAllChatsDialogOpen(true)}>
                Delete all
              </Button>
            </SettingsRow>
            <Separator />
            <SettingsRow label="Delete account">
              <Button variant="destructive" size="sm" onClick={() => setDeleteAccountDialogOpen(true)}>
                Delete
              </Button>
            </SettingsRow>
          </div>
        </DialogContent>
      </Dialog>

      <ApiKeyDialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen} />
      <CustomInstructionsDialog open={customInstructionsDialogOpen} onOpenChange={setCustomInstructionsDialogOpen} />

      <ConfirmationDialog
        open={deleteAllChatsDialogOpen}
        onOpenChange={setDeleteAllChatsDialogOpen}
        onConfirm={handleDeleteAllChats}
        title="Delete All Chats"
        description="Are you sure you want to delete all your chats? This action cannot be undone."
        confirmText="Delete All Chats"
        isLoading={isDeleteAllChatsLoading}
      />

      <ConfirmationDialog
        open={deleteAccountDialogOpen}
        onOpenChange={setDeleteAccountDialogOpen}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you sure you want to delete your account? This will permanently delete all your chats and data. This action cannot be undone."
        confirmText="Delete Account"
        isLoading={isDeleteAccountLoading}
      />
    </>
  )
}

type ApiKeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const config = useChatConfigStore((s) => s.config)
  const updateConfig = useChatConfigStore((s) => s.updateConfig)
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setKey(config.apiKey ?? '')
    }
  }, [open, config.apiKey])

  const handleSave = () => {
    const result = openRouterKeySchema.safeParse(key)
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    updateConfig({ apiKey: key })
    setError(null)
    onOpenChange(false)
    toast.success('API key saved')
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setKey(config.apiKey ?? '')
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>OpenRouter API Key</DialogTitle>
          <DialogDescription>Enter your OpenRouter API key. This is required to use SpeedChat.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk-or-v1-..."
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              setError(null)
            }}
            aria-invalid={!!error}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type CustomInstructionsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CustomInstructionsDialog({ open, onOpenChange }: CustomInstructionsDialogProps) {
  const customInstructions = useCustomInstructionsStore((s) => s.customInstructions)
  const setCustomInstructions = useCustomInstructionsStore((s) => s.setCustomInstructions)
  const saveCustomInstructions = useMutation(api.customInstructions.upsertCustomInstructions)
  const [form, setForm] = useState<CustomInstructionsForm>(EMPTY_CUSTOM_INSTRUCTIONS)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(toCustomInstructionsForm(customInstructions))
      setError(null)
    }
  }, [customInstructions, open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(toCustomInstructionsForm(customInstructions))
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSave = async () => {
    const parsed = CustomInstructionsSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid custom instructions')
      return
    }

    try {
      setIsSaving(true)
      const saved = await saveCustomInstructions(parsed.data)
      setCustomInstructions(saved)
      toast.success(saved ? 'Custom instructions saved' : 'Custom instructions cleared')
      onOpenChange(false)
    } catch (mutationError) {
      toast.error(getErrorMessage(mutationError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Custom instructions</DialogTitle>
          <DialogDescription>Tell the model about you and how it should respond.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="custom-instructions-name">Your name</Label>
            <Input
              id="custom-instructions-name"
              value={form.name}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }))
                setError(null)
              }}
              placeholder="Sam Altman"
              aria-invalid={!!error}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-instructions-profession">Profession</Label>
            <Input
              id="custom-instructions-profession"
              value={form.profession}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, profession: event.target.value }))
                setError(null)
              }}
              placeholder="Software engineer"
              aria-invalid={!!error}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-instructions-about-user">More about you</Label>
            <Textarea
              id="custom-instructions-about-user"
              value={form.aboutUser}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, aboutUser: event.target.value }))
                setError(null)
              }}
              placeholder="What should the model know about you?"
              rows={4}
              aria-invalid={!!error}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-instructions-response-instructions">Additional instructions</Label>
            <Textarea
              id="custom-instructions-response-instructions"
              value={form.responseInstructions}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, responseInstructions: event.target.value }))
                setError(null)
              }}
              placeholder="Example: Keep answers concise, include numbered steps, and ask follow-up questions when needed."
              rows={6}
              aria-invalid={!!error}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
