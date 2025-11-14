import { Disclosure, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { FAQItem } from '@/data/faq-items';

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Disclosure key={item.id}>
          {({ open }) => (
            <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Disclosure.Button className="flex w-full items-center justify-between px-6 py-5 text-left">
                <span className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
                  {item.question}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </Disclosure.Button>
              <Transition
                enter="transition duration-200 ease-out"
                enterFrom="transform opacity-0"
                enterTo="transform opacity-100"
                leave="transition duration-150 ease-out"
                leaveFrom="transform opacity-100"
                leaveTo="transform opacity-0"
              >
                <Disclosure.Panel className="px-6 pb-5">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.answer}
                  </p>
                </Disclosure.Panel>
              </Transition>
            </div>
          )}
        </Disclosure>
      ))}
    </div>
  );
}
