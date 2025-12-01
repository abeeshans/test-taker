import React from 'react'
import BaseModal from './BaseModal'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string | null
}

export default function ImagePreviewModal({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) {
  if (!imageUrl) return null

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Image Preview"
      maxWidth="max-w-[95vw] lg:max-w-7xl"
      contentClassName="p-0 h-[85vh] bg-gray-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden rounded-b-lg"
    >
      <div className="w-full h-full p-4 flex items-center justify-center">
        <img 
          src={imageUrl} 
          alt="Expanded view" 
          className="w-full h-full object-contain rounded-md shadow-sm"
        />
      </div>
    </BaseModal>
  )
}
