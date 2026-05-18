// Transparently warns friends when we lacked test devices yet still care.

const CalendarVendorUncertaintyFootnote = ({ vendorLabel }: { vendorLabel: string }) => (
  <span className="mt-[0.4rem] block text-[0.82em] opacity-85">
    (We don&rsquo;t use {vendorLabel} and didn&rsquo;t test this! Hopefully it works!)
  </span>
);

export default CalendarVendorUncertaintyFootnote;
