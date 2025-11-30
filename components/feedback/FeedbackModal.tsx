import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { trpc } from '../../utils/trpc';

const FeedbackFormSchema = z.object({
  category: z.enum(['bug', 'feature', 'general', 'praise']).optional(),
  rating: z.number().min(1).max(5).optional(),
  message: z.string().min(10, 'Please provide at least 10 characters').max(2000),
});

type FeedbackFormData = z.infer<typeof FeedbackFormSchema>;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(FeedbackFormSchema),
    defaultValues: { category: undefined, rating: undefined, message: '' },
  });

  const selectedRating = watch('rating');

  const submitFeedback = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      reset();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit feedback');
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    submitFeedback.mutate({
      ...data,
      type: 'widget',
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
                Share Your Feedback
              </Dialog.Title>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category (optional)
                  </label>
                  <select
                    {...register('category')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                  >
                    <option value="">Select a category</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="general">General Feedback</option>
                    <option value="praise">Praise</option>
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating (optional)
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setValue('rating', star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="text-2xl focus:outline-none transition-colors"
                      >
                        <span
                          className={
                            star <= (hoveredRating || selectedRating || 0)
                              ? 'text-amber-400'
                              : 'text-gray-300'
                          }
                        >
                          {star <= (hoveredRating || selectedRating || 0) ? '★' : '☆'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Feedback <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('message')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-gray-900 placeholder:text-gray-500"
                    placeholder="Tell us what you think..."
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500 mt-1">{errors.message.message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitFeedback.isLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {submitFeedback.isLoading ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
